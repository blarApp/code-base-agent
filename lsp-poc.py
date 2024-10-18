import asyncio
import websockets
import json


class LSPCaller:
    def __init__(self, host="localhost", port=5000, root_uri=None):
        self.host = host
        self.port = port
        self.root_uri = root_uri
        self.websocket = None

    async def connect(self):
        uri = f"ws://{self.host}:{self.port}"
        self.websocket = await websockets.connect(uri)

    async def initialize(self):
        initialize_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "processId": None,
                "rootUri": self.root_uri,
                "capabilities": {},
            },
        }
        await self.send_request(initialize_request)

    async def send_request(self, request):
        await self.websocket.send(json.dumps(request))
        response = await self.websocket.recv()
        return json.loads(response)

    async def get_document_symbols(self, document_uri):
        document_symbol_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "textDocument/documentSymbol",
            "params": {"textDocument": {"uri": document_uri}},
        }
        return await self.send_request(document_symbol_request)

    async def get_references(self, document_uri, position):
        reference_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "textDocument/references",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
                "context": {"includeDeclaration": True},
            },
        }
        return await self.send_request(reference_request)

    async def shutdown(self):
        shutdown_request = {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "shutdown",
            "params": None,
        }
        await self.send_request(shutdown_request)

    async def exit(self):
        exit_request = {"jsonrpc": "2.0", "method": "exit"}
        await self.websocket.send(json.dumps(exit_request))

    async def close(self):
        await self.websocket.close()


def pretty_print(data):
    print(json.dumps(data, indent=2))


async def main():
    lsp_caller = LSPCaller(root_uri="file:///home/juan/devel/blar/git-webhook-tester")
    await lsp_caller.connect()

    try:
        await lsp_caller.initialize()
        document_uri = "file:///home/juan/devel/blar/git-webhook-tester/main.py"
        document_symbols = await lsp_caller.get_document_symbols(document_uri)
        pretty_print(document_symbols)

    finally:
        await lsp_caller.shutdown()
        await lsp_caller.exit()
        await lsp_caller.close()


# Run the WebSocket client to get import paths from main.py
asyncio.run(main())
