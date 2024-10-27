document.addEventListener("DOMContentLoaded", function() {
    try {
        window.chatDisplayDiv = document.getElementById("chatDisplayDiv");
        window.messageBoxTextArea = document.getElementById("messageBoxTextArea");
        window.attachmentInput = document.getElementById("attachmentInput");
        window.sendButton = document.getElementById("sendButton");
        window.userNameHeader = document.getElementById("userNameHeader");
        window.clean = function(text){
            return DOMPurify.sanitize(text, {
                ADD_DATA_URI_TAGS: ['a', 'img', 'video', 'audio'], 
                ALLOWED_TAGS: ['i', 'a', 'b', 'p', 'img', 'br', 'video', 'strong', 'audio', 'tabel', 'tr', 'td',
                    'th','thead', 'tbody', 'tfoot', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                    'pre','code','blockquote', 'colgroup', 'col', 'dl','dt','dd'
                ],
                ALLOWED_ATTR: ['href', 'src'],
                FORBID_ATTR: ['style']
            });
        }
        
        const element = document.getElementById("createOrJoin");
        const clonedElement = element.cloneNode(true);
        clonedElement.classList.remove("hideme");

        new WinBox("Mount DOM", {
            modal: true,
            class: "body",
            mount: clonedElement
        });
    } catch (error) {
        localMessage("System", error.message);
    }
});

function changeName(){
    try {
        let olderUserName = window.displayName;
        let newUserName = prompt("Enter a new name", window.displayName);
        if (newUserName === null || newUserName === "") return;
        window.displayName = newUserName;
        window.userNameHeader.innerText = `You are ${window.displayName}`;
        sendMessageApi(`I changed my name from ${olderUserName} to ${window.displayName}.`);
    } catch (error) {
        localMessage("System", error.message);
    }
}

function toggleElm(elm) {
    try {
        const element = document.querySelector("#winbox-1 .wb-body #createOrJoin #" + elm);
        element.classList.toggle("hideme");
    } catch (error) {
        localMessage("System", error.message);
    }
}

function escape(str){
    try {
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    } catch (error) {
        localMessage("System", error.message);
    }
}

function unescape(str){
    try {
        return str.replace(/\\\\"/g, '"').replace(/\\\\/g, '\\');
    } catch (error) {
        localMessage("System", error.message);
    }
}