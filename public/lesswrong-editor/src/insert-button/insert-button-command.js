import Command from "@ckeditor/ckeditor5-core/src/command";

export default class InsertButtonCommand extends Command {
	execute() {
		this.editor.model.change((writer) => {
			// Insert <simpleBox>*</simpleBox> at the current selection position
			// in a way that will result in creating a valid model structure.
			this.editor.model.insertContent(createInsertButton(writer));
		});
	}

	refresh() {
		const model = this.editor.model;
		const selection = model.document.selection;
		const allowedIn = model.schema.findAllowedParent(selection.getFirstPosition(), "insertButton");

		this.isEnabled = allowedIn !== null;
	}
}

function createInsertButton(writer) {
	const insertButton = writer.createElement("insertButton");
	writer.appendText("Button text here", insertButton);

	return insertButton;
}
