const TYPES = {
    TEXT: 'TEXT',
    JSON: 'JSON',
    BLOB: 'BLOB',
    ARRAY_BUFFER: 'ARRAY_BUFFER'
}
const HTTP_SERVER = 'http://localhost:9999/base/test/unit';

class FileLoader {
    static async loadTextFile(url, options) {
        return FileLoader._loadFile(url, options, TYPES.TEXT);
    }

    static async loadJsonFile(url, options) {
        return FileLoader._loadFile(url, options, TYPES.JSON);
    }

    static async loadBlobFile(url, options) {
        return FileLoader._loadFile(url, options, TYPES.BLOB);
    }

    static async loadArrayBufferFile(url, options) {
        return FileLoader._loadFile(url, options, TYPES.ARRAY_BUFFER);
    }

    static async _loadFile(url, options, returnType) {
        try {
            url = HTTP_SERVER + url;
            const response = await fetch(url, options);

            if (!response.ok) {
                console.log('Network response was not OK');
            }

            switch (returnType) {
                case TYPES.TEXT:
                    return response.text();
                case TYPES.JSON:
                    return response.json();
                case TYPES.ARRAY_BUFFER:
                    return response.arrayBuffer();
                case TYPES.BLOB:
                    return response.blob();
                default:
                    return response.text();

            }
        } catch (e) {
            console.log(e);
        }
    }
}

export default FileLoader
