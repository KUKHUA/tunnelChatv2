window.serverInstance = new URL('http://localhost:2427');
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
            if(featureFlags.debug) console.log(`Tunnel Event Source for ${tunnelId}-${subChannel} received message: ${event.data}.`);
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