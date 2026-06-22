const TYPES = {
    TEXT: 'TEXT',
    JSON: 'JSON',
    BLOB: 'BLOB',
    ARRAY_BUFFER: 'ARRAY_BUFFER'
}
// Use the actual Karma server origin (window.location.origin) so the port is
// always correct even when Karma picks a different port than the configured
// default (e.g. when port 9999 is already in use).
const HTTP_SERVER = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999') + '/base/test/unit';

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
        url = HTTP_SERVER + url;
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`FileLoader: ${url} returned ${response.status}`);
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
    }
}

export default FileLoader
