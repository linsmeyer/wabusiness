// public/components/emoji-picker.js

function initializeEmojiPicker(options) {
    const { triggerButton, inputField, pickerContainer } = options;

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

    // Mostra/esconde o painel ao clicar no botão gatilho
    triggerButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Impede que o clique feche o painel imediatamente
        pickerContainer.classList.toggle('hidden');
    });

    // Esconde o painel se clicar em qualquer outro lugar da página
    document.addEventListener('click', (event) => {
        if (!pickerContainer.contains(event.target) && event.target !== triggerButton) {
            pickerContainer.classList.add('hidden');
        }
    });
}
