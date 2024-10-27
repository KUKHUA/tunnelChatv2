async function generateKeys() {
    try {
        if (featureFlags.debug) console.log("Generating keys...");
        window.userID = window.crypto.getRandomValues(new Uint32Array(4)).join('');
        window.tunnelKey = window.crypto.getRandomValues(new Uint32Array(1)).join('');
        if (featureFlags.debug) console.log(`Generated userID: ${window.userID}`);
        window.keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
        if (featureFlags.debug) console.log("Key pair generated.");
        window.keys = { [window.userID]: { publicKey: arrayBufferToHex(await window.crypto.subtle.exportKey("spki", window.keyPair.publicKey)) } };
        if (featureFlags.debug) console.log("Keys stored:", window.keys);
    } catch (error) {
        localMessage(System, error.message);
    }
}

function stringToHex(string) {
    try {
        if (featureFlags.debug) console.log(`Converting string to hex: ${string}`);
        return Array.from(new TextEncoder().encode(string))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch (error) {
        localMessage(System, error.message);
        return string;
    }
}

function hexToString(hexString) {
    try {
        if (featureFlags.debug) console.log(`Converting hex string to string: ${hexString}`);
        const hexArray = hexString.match(/.{1,2}/g);
        if (!hexArray) {
            throw new Error("Invalid hex string");
        }
        if (featureFlags.debug) console.log(new TextDecoder().decode(new Uint8Array(hexArray.map(byte => parseInt(byte, 16)))));
        return new TextDecoder().decode(new Uint8Array(hexArray.map(byte => parseInt(byte, 16))));
    } catch (error) {
        localMessage(System, error.message);
        return hexString;
    }
}

function arrayBufferToHex(buffer) {
    try {
        if (featureFlags.debug) console.log("Converting ArrayBuffer to hex.");
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch (error) {
        localMessage(System, error.message);
    }
}

function hexToArrayBuffer(hexString) {
    try {
        if (featureFlags.debug) console.log(`Converting hex string to ArrayBuffer: ${hexString}`);
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    } catch (error) {
        localMessage(System, error.message);
    }
}

function handleKeyExchange(event) {
    try {
        let keyExchangeData = JSON.parse(event);
        if (featureFlags.debug) console.log(`Received key exchange event from userID: ${keyExchangeData.userID}`);
        if (keyExchangeData.userID === window.userID) {
            if (featureFlags.debug) console.log("Ignoring key exchange event from self.");
            return;
        }
        if (window.keys[keyExchangeData.userID]) {
            if (featureFlags.debug) console.log("Public key for this userID already exists.");
            return;
        }
        if (featureFlags.debug) console.log("Handling key exchange event:", event);
        if (featureFlags.debug) console.log("Parsed key exchange data:", keyExchangeData);

        // Ensure the keys object exists
        if (!window.keys) {
            window.keys = {};
        }

        // Store the public key of the new client
        window.keys[keyExchangeData.userID] = { publicKey: keyExchangeData.publicKey };
        if (featureFlags.debug) console.log("Updated keys:", window.keys);

        sendKeys();
    } catch (error) {
        localMessage(System, error.message);
    }
}

function sendKeys() {
    try {
        if (featureFlags.debug) console.log("Sending keys...");
        let keyExchangeData = { userID: window.userID, publicKey: window.keys[window.userID].publicKey };
        window.tunnelAPI.sendData(window.tunnelID, 'keyExchange', JSON.stringify(keyExchangeData));
        if (featureFlags.debug) console.log("Keys sent:", keyExchangeData);
    } catch (error) {
        localMessage(System, error.message);
    }
}

async function encryptData(data, publicKey) {
    try {
        if (featureFlags.debug) console.log("Encrypting data...");
        publicKey = await window.crypto.subtle.importKey(
            "spki",
            hexToArrayBuffer(publicKey),
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["encrypt"]
        );
        if (featureFlags.debug) console.log("Public key imported.");
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey,
            new TextEncoder().encode(data)
        );
        if (featureFlags.debug) console.log("Data encrypted.");
        return arrayBufferToHex(encryptedData);
    } catch (error) {
        localMessage(System, error.message);
    }
}

async function decryptData(data, privateKey) {
    try {
        if (featureFlags.debug) console.log("Decrypting data...");
        privateKey = window.keyPair.privateKey;
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
            },
            privateKey,
            hexToArrayBuffer(data)
        );
        if (featureFlags.debug) console.log("Data decrypted." + new TextDecoder().decode(decryptedData));
        return new TextDecoder().decode(decryptedData);
    } catch (error) {
        localMessage(System, error.message);
    }
}