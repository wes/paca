import { useEffect, useRef } from "react";
import { useRenderer } from "@opentui/react";
import type { InputRenderable, PasteEvent } from "@opentui/core";

/**
 * Hook to enable paste support for input components.
 * Returns a ref that should be attached to the input element.
 * When the input is focused and a paste event occurs, the text is inserted.
 */
export function usePaste() {
	const renderer = useRenderer();
	const inputRef = useRef<InputRenderable | null>(null);

	useEffect(() => {
		const handlePaste = (event: PasteEvent) => {
			const input = inputRef.current;
			if (input && input.focused) {
				input.insertText(event.text);
				event.preventDefault();
			}
		};

		renderer.keyInput.on("paste", handlePaste);
		return () => {
			renderer.keyInput.off("paste", handlePaste);
		};
	}, [renderer]);

	return inputRef;
}

/**
 * Hook to enable paste support for multiple inputs.
 * Call registerInput(name) to get a ref for each input.
 * When a paste event occurs, it inserts text into the focused input.
 */
export function useMultiPaste() {
	const renderer = useRenderer();
	const inputRefs = useRef<Map<string, InputRenderable | null>>(new Map());

	useEffect(() => {
		const handlePaste = (event: PasteEvent) => {
			for (const input of inputRefs.current.values()) {
				if (input && input.focused) {
					input.insertText(event.text);
					event.preventDefault();
					return;
				}
			}
		};

		renderer.keyInput.on("paste", handlePaste);
		return () => {
			renderer.keyInput.off("paste", handlePaste);
		};
	}, [renderer]);

	const registerInput = (name: string) => {
		return (ref: InputRenderable | null) => {
			if (ref) {
				inputRefs.current.set(name, ref);
			} else {
				inputRefs.current.delete(name);
			}
		};
	};

	return { registerInput };
}
