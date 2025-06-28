// public/components/emoji-picker.js

function initializeEmojiPicker(options) {
    const { inputField, pickerContainer } = options;

    // Lista de emojis (pode ser expandida)
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
        '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
        '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
        '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
        '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👍',
        '👎', '❤️', '💔', '🎉', '🔥', '🙏', '🙌', '👏', '👀'
    ];

    // Popula o painel com os botões de emoji
    emojis.forEach(emoji => {
        const button = document.createElement('button');
        button.textContent = emoji;
        button.addEventListener('click', () => {
            // Insere o emoji na posição atual do cursor
            const start = inputField.selectionStart;
            const end = inputField.selectionEnd;
            const text = inputField.value;
            inputField.value = text.substring(0, start) + emoji + text.substring(end);
            inputField.selectionStart = inputField.selectionEnd = start + emoji.length;
            inputField.focus();
        });
        pickerContainer.appendChild(button);
    });

}
