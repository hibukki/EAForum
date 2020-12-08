import InsertButtonEditing from './insert-button-editing';
import InsertButtonUI from './insert-button-ui';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

export default class InsertButton extends Plugin {
    static get requires() {
        return [ InsertButtonEditing, InsertButtonUI ];
    }
}
