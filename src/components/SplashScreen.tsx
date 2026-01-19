const PACA_TEXT = `
  ██████╗  █████╗  ██████╗ █████╗
  ██╔══██╗██╔══██╗██╔════╝██╔══██╗
  ██████╔╝███████║██║     ███████║
  ██╔═══╝ ██╔══██║██║     ██╔══██║
  ██║     ██║  ██║╚██████╗██║  ██║
  ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

export function SplashScreen() {
  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <text>{PACA_TEXT}</text>
      <text>Task Management for the Terminal</text>
    </box>
  );
}
