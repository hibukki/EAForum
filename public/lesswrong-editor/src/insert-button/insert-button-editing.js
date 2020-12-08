import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import { toWidget, toWidgetEditable } from "@ckeditor/ckeditor5-widget/src/utils";
import Widget from "@ckeditor/ckeditor5-widget/src/widget";

import InsertButtonCommand from "./insert-button-command";

export default class InsertButtonEditing extends Plugin {
	static get requires() {
		return [Widget];
	}

	init() {
		console.log("InsertButtonEditing#init() got called");

		this._defineSchema();
		this._defineConverters();

		this.editor.commands.add("insertButton", new InsertButtonCommand(this.editor));
	}

	_defineSchema() {
		const schema = this.editor.model.schema;

		schema.register("insertButton", {
			isObject: true,
			allowWhere: "$block",
			allowContentOf: "$text",
		});
	}

	_defineConverters() {
		const conversion = this.editor.conversion;

		conversion.for("upcast").elementToElement({
			model: "insertButton",
			view: {
				name: "a",
				classes: "insert-button",
			},
		});
		conversion.for("dataDowncast").elementToElement({
			model: "insertButton",
			view: {
				name: "a",
				classes: "insert-button",
			},
		});
		conversion.for("editingDowncast").elementToElement({
			model: "insertButton",
			view: (modelElement, { writer: viewWriter }) => {
				// Note: You use a more specialized createEditableElement() method here.
				const button = viewWriter.createEditableElement("a", { class: "insert-button" });

				return toWidgetEditable(button, viewWriter);
			},
		});
	}
}
