import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Ensure the .paca directory exists in user's home
const pacaDir = join(homedir(), ".paca");
if (!existsSync(pacaDir)) {
  mkdirSync(pacaDir, { recursive: true });
}

// Database path
export const DB_PATH = join(pacaDir, "paca.db");

// Create adapter factory
const adapterFactory = new PrismaLibSql({
  url: `file:${DB_PATH}`,
});

// Create Prisma client with adapter
export const db = new PrismaClient({ adapter: adapterFactory });

// Initialize database connection
export async function initDatabase() {
  try {
    await db.$connect();
    return true;
  } catch (error) {
    console.error("Failed to connect to database:", error);
    return false;
  }
}

// Disconnect from database
export async function closeDatabase() {
  await db.$disconnect();
}

// Status sort order: in_progress first, then todo, then done
const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
};

const sortByStatus = <T extends { status: string; priority: string; createdAt: Date }>(tasks: T[]): T[] => {
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  return [...tasks].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    const priorityDiff = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// Clean up old completed tasks (completed more than N days ago)
export async function cleanupOldCompletedTasks(daysOld = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await db.task.deleteMany({
    where: {
      status: "done",
      completedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

// Project operations
export const projects = {
  async getAll(includeArchived = false) {
    return db.project.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { name: "asc" },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        customer: true,
      },
    });
  },

  async getById(id: string) {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        customer: true,
      },
    });
    if (project) {
      project.tasks = sortByStatus(project.tasks);
    }
    return project;
  },

  async create(data: {
    name: string;
    description?: string;
    color?: string;
    hourlyRate?: number;
  }) {
    return db.project.create({ data });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
      hourlyRate?: number | null;
      archived?: boolean;
    },
  ) {
    return db.project.update({ where: { id }, data });
  },

  async archive(id: string) {
    return db.project.update({ where: { id }, data: { archived: true } });
  },

  async unarchive(id: string) {
    return db.project.update({ where: { id }, data: { archived: false } });
  },

  async delete(id: string) {
    return db.project.delete({ where: { id } });
  },

  async setCustomer(projectId: string, customerId: string | null) {
    return db.project.update({
      where: { id: projectId },
      data: { customerId },
      include: { customer: true },
    });
  },
};

// Task operations
export const tasks = {
  async getByProject(projectId: string) {
    const result = await db.task.findMany({
      where: { projectId },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });
    return sortByStatus(result);
  },

  async getAll() {
    const result = await db.task.findMany({
      include: {
        project: true,
        tags: {
          include: { tag: true },
        },
      },
    });
    return sortByStatus(result);
  },

  async create(data: {
    title: string;
    description?: string;
    projectId: string;
    priority?: string;
    dueDate?: Date;
  }) {
    return db.task.create({ data });
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: Date | null;
    },
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "done") {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== "done") {
      updateData.completedAt = null;
    }
    return db.task.update({ where: { id }, data: updateData });
  },

  async toggleStatus(id: string) {
    const task = await db.task.findUnique({ where: { id } });
    if (!task) return null;

    const statusCycle: Record<string, string> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };

    const newStatus = statusCycle[task.status] || "todo";
    return this.update(id, { status: newStatus });
  },

  async delete(id: string) {
    return db.task.delete({ where: { id } });
  },
};

// Tag operations
export const tags = {
  async getAll() {
    return db.tag.findMany({
      orderBy: { name: "asc" },
    });
  },

  async create(data: { name: string; color?: string }) {
    return db.tag.create({ data });
  },

  async addToTask(taskId: string, tagId: string) {
    return db.taskTag.create({
      data: { taskId, tagId },
    });
  },

  async removeFromTask(taskId: string, tagId: string) {
    return db.taskTag.delete({
      where: { taskId_tagId: { taskId, tagId } },
    });
  },
};

// Stats for dashboard
export const stats = {
  async getDashboardStats() {
    const [
      totalProjects,
      activeProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      overdueTasks,
    ] = await Promise.all([
      db.project.count(),
      db.project.count({ where: { archived: false } }),
      db.task.count(),
      db.task.count({ where: { status: "todo" } }),
      db.task.count({ where: { status: "in_progress" } }),
      db.task.count({ where: { status: "done" } }),
      db.task.count({
        where: {
          status: { not: "done" },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      totalProjects,
      activeProjects,
      archivedProjects: totalProjects - activeProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      overdueTasks,
      completionRate:
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    };
  },

  async getRecentActivity(limit = 10) {
    const tasks = await db.task.findMany({
      take: limit * 2, // Fetch more to ensure good coverage after sorting
      orderBy: { updatedAt: "desc" },
      include: {
        project: {
          select: { name: true, color: true },
        },
      },
    });

    // Sort by status (in_progress -> todo -> done), then by updatedAt within each group
    return tasks
      .sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, limit);
  },

  async getTimeStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayEntries, weekEntries, monthEntries] = await Promise.all([
      db.timeEntry.findMany({
        where: { startTime: { gte: today }, endTime: { not: null } },
      }),
      db.timeEntry.findMany({
        where: { startTime: { gte: weekStart }, endTime: { not: null } },
      }),
      db.timeEntry.findMany({
        where: { startTime: { gte: monthStart }, endTime: { not: null } },
      }),
    ]);

    const calcDuration = (
      entries: { startTime: Date; endTime: Date | null }[],
    ) =>
      entries.reduce((sum, e) => {
        if (!e.endTime) return sum;
        return (
          sum +
          (new Date(e.endTime).getTime() - new Date(e.startTime).getTime())
        );
      }, 0);

    return {
      todayMs: calcDuration(todayEntries),
      weekMs: calcDuration(weekEntries),
      monthMs: calcDuration(monthEntries),
    };
  },

  async getWeeklyTimeStats(months = 6) {
    // Get date 6 months ago
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setHours(0, 0, 0, 0);
    // Set to start of that week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Get all time entries in this range
    const entries = await db.timeEntry.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { not: null },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    // Group entries by week and project
    const weeklyData = new Map<string, Map<string, { ms: number; project: { id: string; name: string; color: string } }>>();

    for (const entry of entries) {
      if (!entry.endTime) continue;

      // Get week start (Sunday) for this entry
      const entryDate = new Date(entry.startTime);
      const weekStart = new Date(entryDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split("T")[0]!;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, new Map());
      }

      const weekMap = weeklyData.get(weekKey)!;
      const projectId = entry.project.id;

      if (!weekMap.has(projectId)) {
        weekMap.set(projectId, { ms: 0, project: entry.project });
      }

      const projectData = weekMap.get(projectId)!;
      projectData.ms += new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
    }

    // Convert to array sorted by week
    const result: {
      weekStart: string;
      weekLabel: string;
      projects: { projectId: string; projectName: string; projectColor: string; ms: number }[];
      totalMs: number;
    }[] = [];

    const sortedWeeks = Array.from(weeklyData.keys()).sort();
    for (const weekKey of sortedWeeks) {
      const weekMap = weeklyData.get(weekKey)!;
      const weekDate = new Date(weekKey);
      const weekLabel = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;

      const projects: { projectId: string; projectName: string; projectColor: string; ms: number }[] = [];
      let totalMs = 0;

      for (const [projectId, data] of weekMap) {
        projects.push({
          projectId,
          projectName: data.project.name,
          projectColor: data.project.color,
          ms: data.ms,
        });
        totalMs += data.ms;
      }

      result.push({
        weekStart: weekKey,
        weekLabel,
        projects,
        totalMs,
      });
    }

    return result;
  },
};

// Time entry operations
export const timeEntries = {
  async getRunning() {
    return db.timeEntry.findFirst({
      where: { endTime: null },
      include: {
        project: {
          select: { id: true, name: true, color: true, hourlyRate: true },
        },
      },
    });
  },

  async start(projectId: string) {
    // Stop any existing running timer first
    const running = await this.getRunning();
    if (running) {
      await this.stop(running.id, "Timer stopped automatically");
    }

    return db.timeEntry.create({
      data: {
        projectId,
        startTime: new Date(),
      },
      include: {
        project: {
          select: { id: true, name: true, color: true, hourlyRate: true },
        },
      },
    });
  },

  async stop(id: string, description?: string) {
    return db.timeEntry.update({
      where: { id },
      data: {
        endTime: new Date(),
        description,
      },
      include: {
        project: {
          select: { id: true, name: true, color: true, hourlyRate: true },
        },
      },
    });
  },

  async getByProject(projectId: string, limit = 50) {
    return db.timeEntry.findMany({
      where: { projectId, endTime: { not: null } },
      orderBy: { startTime: "desc" },
      take: limit,
    });
  },

  async getRecent(limit = 10) {
    return db.timeEntry.findMany({
      where: { endTime: { not: null } },
      orderBy: { startTime: "desc" },
      take: limit,
      include: {
        project: {
          select: { id: true, name: true, color: true, hourlyRate: true },
        },
      },
    });
  },

  async delete(id: string) {
    return db.timeEntry.delete({ where: { id } });
  },

  async getProjectTotalTime(projectId: string) {
    const entries = await db.timeEntry.findMany({
      where: { projectId, endTime: { not: null } },
    });

    return entries.reduce((sum, e) => {
      if (!e.endTime) return sum;
      return (
        sum + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime())
      );
    }, 0);
  },

  async getUninvoiced() {
    return db.timeEntry.findMany({
      where: {
        invoiceId: null,
        endTime: { not: null },
      },
      orderBy: { startTime: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            hourlyRate: true,
            customer: true,
          },
        },
      },
    });
  },

  async update(
    id: string,
    data: { startTime?: Date; endTime?: Date; description?: string },
  ) {
    return db.timeEntry.update({
      where: { id },
      data,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            hourlyRate: true,
            customer: true,
          },
        },
      },
    });
  },

  async markInvoiced(ids: string[], invoiceId: string) {
    return db.timeEntry.updateMany({
      where: { id: { in: ids } },
      data: { invoiceId },
    });
  },

  async getAllForWeek(weekStart: Date) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return db.timeEntry.findMany({
      where: {
        endTime: { not: null },
        startTime: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: { startTime: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            hourlyRate: true,
            customer: true,
          },
        },
      },
    });
  },

  async getOldestEntryDate() {
    const oldest = await db.timeEntry.findFirst({
      where: { endTime: { not: null } },
      orderBy: { startTime: "asc" },
      select: { startTime: true },
    });
    return oldest?.startTime ?? null;
  },
};

// Settings operations
export const settings = {
  async get(key: string): Promise<string | null> {
    const setting = await db.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  async getAll(): Promise<Record<string, string>> {
    const allSettings = await db.setting.findMany();
    return Object.fromEntries(allSettings.map((s) => [s.key, s.value]));
  },

  async getAppSettings() {
    const all = await this.getAll();
    return {
      businessName: all.businessName ?? "",
      stripeApiKey: all.stripeApiKey ?? "",
      timezone: all.timezone ?? "auto",
      theme: all.theme ?? "catppuccin-mocha",
      menuBar: all.menuBar ?? "disabled",
    };
  },
};

// Customer operations
export const customers = {
  async getAll() {
    return db.customer.findMany({
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string) {
    return db.customer.findUnique({ where: { id } });
  },

  async create(data: { name: string; email: string }) {
    return db.customer.create({ data });
  },

  async update(id: string, data: { name?: string; email?: string; stripeCustomerId?: string | null }) {
    return db.customer.update({ where: { id }, data });
  },

  async delete(id: string) {
    return db.customer.delete({ where: { id } });
  },

  async updateStripeId(id: string, stripeCustomerId: string) {
    return db.customer.update({
      where: { id },
      data: { stripeCustomerId },
    });
  },
};

// Invoice operations
export const invoices = {
  async create(data: {
    projectId: string;
    customerId: string;
    totalHours: number;
    totalAmount: number;
    timeEntryIds: string[];
  }) {
    const { timeEntryIds, ...invoiceData } = data;

    // Create invoice and link time entries in a transaction
    return db.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({ data: invoiceData });

      // Link time entries to this invoice
      await tx.timeEntry.updateMany({
        where: { id: { in: timeEntryIds } },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });
  },

  async updateStripeId(id: string, stripeInvoiceId: string) {
    return db.invoice.update({
      where: { id },
      data: { stripeInvoiceId },
    });
  },

  async getByProject(projectId: string) {
    return db.invoice.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        timeEntries: true,
      },
    });
  },

  async getByCustomer(customerId: string) {
    return db.invoice.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        project: true,
        timeEntries: true,
      },
    });
  },

  async getAll() {
    return db.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: true,
        customer: true,
        timeEntries: true,
      },
    });
  },
};

// Database import/export operations
export const database = {
  async exportToFile(targetPath: string): Promise<void> {
    const { copyFileSync } = await import("fs");
    copyFileSync(DB_PATH, targetPath);
  },

  async importFromFile(sourcePath: string): Promise<void> {
    const { copyFileSync, existsSync } = await import("fs");
    if (!existsSync(sourcePath)) {
      throw new Error("Source file does not exist");
    }
    // Close connection, copy file, reconnect
    await db.$disconnect();
    copyFileSync(sourcePath, DB_PATH);
    await db.$connect();
  },
};
