import asyncio
import websockets
import json


class LspCaller:
    def __init__(self, host="localhost", port=5000, root_uri=None):
        self.host = host
        self.port = port
        self.root_uri = root_uri
        self.websocket = None
        self.cache = {}
        self.unmatched_responses = {}
        self.response_futures = {}

        self.id = 0
        self.id_lock = asyncio.Lock()

    async def get_id(self):
        async with self.id_lock:
            current_id = self.id
            self.id += 1
        return current_id

    async def connect(self):
        uri = f"ws://{self.host}:{self.port}"
        self.websocket = await websockets.connect(uri)
        asyncio.create_task(self.listen_for_responses())

    async def listen_for_responses(self):
        while True:
            try:
                response = await self.websocket.recv()
                response = json.loads(response)
                response_id = response.get("id")

                # Resolve the future if it exists
                if response_id in self.response_futures:
                    future = self.response_futures.pop(response_id)
                    future.set_result(response)  # Set the result of the future
                else:
                    # Store unmatched responses
                    self.unmatched_responses[response_id] = response
            except websockets.ConnectionClosedOK:
                # Handle normal closure of connection
                print("WebSocket connection closed normally.")
                break  # Exit the loop on normal closure
            except Exception as e:
                # Handle any other exceptions
                print(f"Error in listen_for_responses: {e}")
                break  # O

    async def initialize(self):
        initialize_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "initialize",
            "params": {
                "processId": None,
                "rootUri": self.root_uri,
                "capabilities": {},
            },
        }
        return await self.send_request(initialize_request)

    async def send_request(self, request):
        req_key = (request["method"], json.dumps(request["params"]))
        request_id = request["id"]

        # Check if the request is already cached
        if req_key in self.cache:
            return self.cache[req_key]

        # Create a future for the response
        future = asyncio.Future()
        self.response_futures[request_id] = future

        # Send the request
        await self.websocket.send(json.dumps(request))

        # Await the future to get the response
        response = await future

        # Cache and return the response
        self.cache[req_key] = response
        return response

    async def get_document_symbols(self, document_uri):
        document_symbol_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "textDocument/documentSymbol",
            "params": {"textDocument": {"uri": document_uri}},
        }
        response = await self.send_request(document_symbol_request)
        return response.get("result")

    async def get_definition(self, document_uri, position):
        definition_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "textDocument/definition",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
            },
        }
        response = await self.send_request(definition_request)
        if response.get("result"):
            return response["result"][0]
        return None

    async def get_declaration(self, document_uri, position):
        declaration_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "textDocument/declaration",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
            },
        }
        response = await self.send_request(declaration_request)
        if response.get("result"):
            return response["result"][0]
        return None

    async def get_references(self, document_uri, position):
        reference_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "textDocument/references",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
                "context": {"includeDeclaration": False},
            },
        }
        response = await self.send_request(reference_request)
        return response.get("result")

    async def get_selection_range(self, document_uri, position):
        selection_range_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "textDocument/selectionRange",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
            },
        }
        response = await self.send_request(selection_range_request)
        return response.get("result")

    async def get_document_link(self, document_uri):
        document_link_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
            "method": "textDocument/documentLink",
            "params": {"textDocument": {"uri": document_uri}},
        }
        response = await self.send_request(document_link_request)
        return response.get("result")

    async def shutdown_exit_close(self):
        await self.shutdown()
        await self.exit()
        await self.close()

    async def shutdown(self):
        shutdown_request = {
            "jsonrpc": "2.0",
            "id": await self.get_id(),
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
    lsp_caller = LspCaller(
        root_uri="file:///home/juan/devel/blar/lsp-poc/lsp-poc",
    )
    await lsp_caller.connect()

    try:
        await lsp_caller.initialize()
        document_uri = "file:///home/juan/devel/blar/lsp-poc/lsp-poc/Graph/Relationship/Relationship.py"

        document_symbols = await lsp_caller.get_document_symbols(document_uri)

        # Concurrently fetching definitions, references, declarations, etc.
        tasks = [
            lsp_caller.get_definition(document_uri, {"line": 7, "character": 8}),
            lsp_caller.get_references(document_uri, {"line": 7, "character": 8}),
            lsp_caller.get_declaration(document_uri, {"line": 7, "character": 8}),
        ]

        definitions, references, declaration = await asyncio.gather(*tasks)

        print("Document symbols:")
        pretty_print(document_symbols)

        print("Definitions:")
        pretty_print(definitions)

        print("References:")
        pretty_print(references)

        print("Declaration:")
        pretty_print(declaration)

    except websockets.exceptions.ConnectionClosedOK:
        print("Connection closed successfully.")

    finally:
        await lsp_caller.shutdown_exit_close()


if __name__ == "__main__":
    asyncio.run(main())
