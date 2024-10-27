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

        if (decryptedMessage.includes("SYSTEM_ATTACHMENT:")) {
            let attachmentList = decryptedMessage.split(":")[1].split("_")[0];
            let totalChunks = parseInt(decryptedMessage.split(":")[1].split("_")[1]);
            let fileType = decryptedMessage.split(":")[1].split("_")[2];
            let attachmentData = new Array(totalChunks).fill(null);
            let receivedChunks = 0;
            let subChannel = `attachment_${stringToHex(attachmentList)}`;
            console.log(`Attachment received: ${attachmentList} (${totalChunks} chunks)`);

            let listenAttach = await window.tunnelAPI.startStreaming(window.tunnelID, subChannel);

            listenAttach.onmessage = async function(message) {
                message = unescape(hexToString(message.data));
                console.log(message);
                let attachMessage = JSON.parse(message);
                if (attachMessage.for === window.userID && attachmentData[attachMessage.chunk] === null) {
                    attachmentData[attachMessage.chunk] = attachMessage.data;
                    receivedChunks++;
                    console.log(`Received chunk ${attachMessage.chunk} of ${totalChunks}`);

                    if (receivedChunks === totalChunks) {
                        // All chunks received, combine them
                        let combinedData = attachmentData.join('');
                        let fileBlob = new Blob([base64ToArrayBuffer(combinedData)],{ type: fileType });
                        fileURL = URL.createObjectURL(fileBlob);
                        console.log(fileURL,fileType);
                        let renderedAttachment = renderAttachment(attachmentList, fileURL.toString());
                        await localMessage('System', `Attachment received: ${renderedAttachment}`);
                        console.log(`Attachment received: ${attachmentList}`);
                        listenAttach.close(); // Stop listening on this subchannel
                    }
                }
            };
        }
    } catch (error) {
        console.log(error);
        return;
    }
}

function addAttachment() {
    try {
        if (window.attachmentInput.showPicker) {
            window.attachmentInput.showPicker();
        } else {
            window.attachmentInput.click();
        }

        window.attachmentInput.onchange = function() {
            const file = window.attachmentInput.files[0];
            const reader = new FileReader();
            reader.onload = async function() {
                const attachmentData = reader.result.split(',')[1]; // Get base64 part
                const attachmentList = file.name;
                const chunkSize = 1024 * 1024;
                const chunks = Math.ceil(attachmentData.length / chunkSize);
                const subChannel = `attachment_${stringToHex(attachmentList)}`;
                sendMessageApi('SYSTEM_ATTACHMENT:' + attachmentList + "_" + chunks + "_" + file.type);

                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second

                for (let i = 0; i < chunks; i++) {
                    let chunk = attachmentData.slice(i * chunkSize, (i + 1) * chunkSize);
                    let sendData = { for: window.userID, data: chunk, chunk: i, totalChunks: chunks };
                    window.tunnelAPI.sendData(window.tunnelID, subChannel, JSON.stringify(sendData));
                    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for 300ms before sending the next chunk
                }
            };
            reader.readAsDataURL(file);
        };
    } catch (error) {
        localMessage('System', error.message);
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
            userID: window.userID,
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

function renderAttachment(attachmentList, attachmentData) {
    let fileType = attachmentList.split(".").pop();
    console.log(fileType);
    if (fileType == "png" || fileType == "jpg" || fileType == "jpeg" || fileType == "gif") {
      let img = document.createElement("img");
      img.src = attachmentData;
      return img.outerHTML;
    } else if (fileType == "mp4" || fileType == "webm" || fileType == "mov" || fileType == "avi" || fileType == "mkv") {
      let video = document.createElement("video");
      video.src = attachmentData;
      video.controls = true;
      return video.outerHTML;
    } else if (fileType == "mp3" || fileType == "wav" || fileType == "flac" || fileType == "ogg") {
      let audio = document.createElement("audio");
      audio.src = attachmentData;
      audio.controls = true;
      return audio.outerHTML;
    } else {
      return `<a href="${attachmentData}" target="_blank">${attachmentList}</a>`;
    }
  }