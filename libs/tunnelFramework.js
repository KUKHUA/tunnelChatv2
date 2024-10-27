window.serverInstance = new URL('https://lluck.hackclub.app');
window.tunnelEventSource = [];
window.featureFlags = {debug: true};
window.tunnelAPI = {
    startStreaming: function(tunnelId, subChannel, eventCallback){
        if(!tunnelId) return;
        if(!subChannel) subChannel = 'main';
        const eventURL = new URL(`/api/v2/tunnel/stream`, serverInstance);
        eventURL.search = new URLSearchParams({
            id: tunnelId,
            subChannel: subChannel
        }).toString();

        window.tunnelEventSource[subChannel] = new EventSource(eventURL.toString());
        window.tunnelEventSource[subChannel].onmessage = function(event){
            eventCallback(unescape(hexToString(event.data)));
        }

        if(featureFlags.debug){
            console.log(`Tunnel Event Source for ${tunnelId}-${subChannel} started`);
            window.tunnelEventSource[subChannel].addEventListener('message', function(event){
                console.log(`Tunnel Event Source for ${tunnelId}-${subChannel} received message: ${event.data}.`);
            });
        } 
        return window.tunnelEventSource[subChannel];
    },

    stopStreaming: function(tunnelId, subChannel){
        if(!tunnelId) return;
        if(!subChannel) subChannel = 'main';
        if(window.tunnelEventSource[subChannel]){
            window.tunnelEventSource[subChannel].close();
            delete window.tunnelEventSource[subChannel];
            if(featureFlags.debug) console.log(`Tunnel Event Source for ${tunnelId}-${subChannel} stopped.`);
        }
    },

    create: async function() {
        try {
            const createURL = new URL(`/api/v2/tunnel/create`, serverInstance);
            const response = await fetch(createURL);
            const data = await response.json();
            if (featureFlags.debug) console.log(`Tunnel ${data.tunnelId} created.`);
            return data.id;
        } catch (error) {
            console.error('Error creating tunnel:', error);
            throw error;
        }
    },

    sendData: function(tunnelId, subChannel, messageData){
        if(!tunnelId || !messageData) return;
        if(!subChannel) subChannel = 'main';
        const sendDataURL = new URL(`/api/v2/tunnel/send`, serverInstance);
        
        fetch(sendDataURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: tunnelId,
                subChannel: subChannel,
                content: escape(stringToHex(messageData))
            })
        })
        .then(messageData => {
            if(featureFlags.debug) console.log(`The following data has been sent to ${tunnelId}-${subChannel}.`, messageData);
        })
    },
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