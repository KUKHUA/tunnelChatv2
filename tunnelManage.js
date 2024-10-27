async function createTunnel() {
    try {
        generateKeys();
        window.tunnelID = await window.tunnelAPI.create();
        window.displayName = document.querySelector("#winbox-1 .wb-body #createOrJoin #userNameInput").value;
        window.tunnelAPI.startStreaming(window.tunnelID, 'main', handleMessage);
        window.keyExchange = window.tunnelAPI.startStreaming(window.tunnelID, 'keyExchange', handleKeyExchange);
        document.querySelectorAll(".wb-close").forEach(elm => elm.click());
        window.userNameHeader.innerText = `You are ${window.displayName}`;
        window.appNameHeader.innerText = `Tunnel ID: ${window.tunnelID}`;
    } catch (error) {
        await localMessage('System', error.message);
    }
}

async function joinTunnel() {
    try {
        await generateKeys();
        const tunnelId = document.querySelector("#winbox-1 .wb-body #createOrJoin #tunnelIDInput").value;
        if (!tunnelId) {
            alert("Please enter a tunnel ID.");
            return;
        }
        window.displayName = document.querySelector("#winbox-1 .wb-body #createOrJoin #userNameInput").value;
        window.tunnelID = tunnelId;
        window.tunnelAPI.startStreaming(window.tunnelID, 'main', handleMessage);
        window.keyExchange = window.tunnelAPI.startStreaming(window.tunnelID, 'keyExchange', handleKeyExchange);
        document.querySelectorAll(".wb-close").forEach(elm => elm.click());
        sendKeys();
    } catch (error) {
        await localMessage('System', error.message);
    }
}

async function handleMessage(message) {
    try {
        let messageData = JSON.parse(message);
        let decryptedMessage = await decryptData(messageData.encryptedMessageList[window.userID].encryptedMessage, window.keyPair.privateKey);
        await localMessage(messageData.displayName, decryptedMessage);
    } catch (error) {
        await localMessage('System', error.message);
    }
}

async function localMessage(name, message) {
    try {
        let messageDiv = document.createElement("div");
        let userName = document.createElement("p");
        if (name === window.displayName) {
            userName.innerText = window.clean(name) + " (You): ";
            userName.style.fontStyle = "italic";
        } else {
            userName.innerText = window.clean(name) + ": ";
            userName.style.fontWeight = "bold";
        }
        messageDiv.appendChild(userName);
        messageDiv.innerHTML += window.clean(marked.parse(message));
        window.chatDisplayDiv.appendChild(messageDiv);
    } catch (error) {
        await localMessage('System', error.message);
    }
}

async function sendMessage() {
    try {
        let userMessage = window.messageBoxTextArea.value;
        let messageData = {
            displayName: window.displayName,
            encryptedMessageList: {}
        };

        for (let users in window.keys) {
            let encryptedMessage = await encryptData(userMessage, window.keys[users].publicKey);
            messageData.encryptedMessageList[users] = { encryptedMessage: encryptedMessage };
        }
        window.tunnelAPI.sendData(window.tunnelID, 'main', JSON.stringify(messageData));
    } catch (error) {
        await localMessage('System', error.message);
    }
}

async function sendMessageApi(message) {
    try {
        let messageData = {
            displayName: window.displayName,
            encryptedMessageList: {}
        };

        for (let users in window.keys) {
            let encryptedMessage = await encryptData(message, window.keys[users].publicKey);
            messageData.encryptedMessageList[users] = { encryptedMessage: encryptedMessage };
        }
        window.tunnelAPI.sendData(window.tunnelID, 'main', JSON.stringify(messageData));
    } catch (error) {
        await localMessage('System', error.message);
    }
}