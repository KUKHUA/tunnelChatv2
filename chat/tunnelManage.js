async function createTunnel() {
    await handleTunnel(async () => {
        window.tunnelID = await window.tunnelAPI.create();
        window.tunnelAPI.startStreaming(window.tunnelID, 'main', handleMessage);
        window.keyExchange = window.tunnelAPI.startStreaming(window.tunnelID, 'keyExchange', handleKeyExchange);
        updateHeaders();
    });
}

async function joinTunnel(tunnelID) {
    await handleTunnel(async () => {
        if(!window.displayName || window.displayName.length > 20) return alert("Please enter a different user name.");
        window.tunnelID = tunnelID;
        window.tunnelAPI.startStreaming(window.tunnelID, 'main', handleMessage);
        window.keyExchange = window.tunnelAPI.startStreaming(window.tunnelID, 'keyExchange', handleKeyExchange);
        if (featureFlags.encryption) sendKeys();
        updateHeaders();
    });
}

async function handleMessage(message) {
    try {
        const messageData = JSON.parse(message);
        const decryptedMessage = await decryptMessage(messageData);
        if (messageData.userID == window.userID) return;
        await localMessage(messageData.displayName, decryptedMessage, false, false);
        window.chatDisplayDiv.scrollTop = window.chatDisplayDiv.scrollHeight;
    } catch (error) {
        handleError(error);
    }
}

async function decryptMessage(messageData) {
    return !featureFlags.encryption && messageData.message
        ? messageData.message
        : await decryptData(messageData.encryptedMessageList[window.userID], window.keyPair.privateKey);
}

async function localMessage(name, message, isUser, isSystem) {
    if(!isUser) isUser = false;
    if(!isSystem) isSystem = false;
    console.log(name, message,(new Error()).stack);
    try {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card mb-2 text-white bg-secondary mb-2 text-left";

        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        const userName = document.createElement("h6");
        userName.className = "card-title";
        if(isUser) {
            cardDiv.className = "card text-white text-right bg-primary mb-2";
            userName.innerText = `${window.clean(name)} (You)`;
            userName.style.fontStyle = "italic";
        } else if(isSystem) {
            cardDiv.className = "card text-white text-left bg-info mb-2";
        } else {
            userName.innerText = window.clean(name);
            userName.style.fontWeight = "bold";
        }

        const messageText = document.createElement("p");
        messageText.className = "card-text";
        messageText.innerHTML = window.clean(marked.parse(message));

        cardBody.appendChild(userName);
        cardBody.appendChild(messageText);
        cardDiv.appendChild(cardBody);

        window.chatDisplayDiv.appendChild(cardDiv);
    } catch (error) {
        alert(error.message);
    }
}

async function sendMessage() {
    try {
        const userMessage = window.messageBoxTextArea.value;
        window.messageBoxTextArea.value = "";
        sendMessageApi(userMessage);
        await localMessage(window.displayName, userMessage, true);
    } catch (error) {
        handleError(error);
    }
}

async function sendMessageApi(message) {
    try {
        const messageData = {
            displayName: window.displayName,
            userID: window.userID,
            encryptedMessageList: {}
        };

        if (!featureFlags.encryption) {
            messageData.message = message;
        } else {
            for (const user in window.keys) {
                messageData.encryptedMessageList[user] = await encryptData(message, window.keys[user].publicKey);
            }
        }

        window.tunnelAPI.sendData(window.tunnelID, 'main', JSON.stringify(messageData));
    } catch (error) {
        handleError(error);
    }
}

function getInputValue(selector) {
    return document.querySelector(`#winbox-1 .wb-body #createOrJoin ${selector}`)?.value ?? "";
}

function updateHeaders() {
    document.querySelectorAll(".wb-close").forEach(elm => elm.click());
    window.userNameHeader.innerText = `You are ${window.displayName}`;
    window.appNameHeader.innerText = `Tunnel ID: ${window.tunnelID}`;
}

async function handleTunnel(callback) {
    try {
        if (featureFlags.encryption) await generateKeys();
        await callback();
    } catch (error) {
        handleError(error);
    }
}

function handleError(error) {
    localMessage('System', error.message, false, true);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}