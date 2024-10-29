import websockets.sync.client as ws
import json


class LspCaller:
    def __init__(self, host="localhost", port=5000, root_uri=None):
        self.host = host
        self.port = port
        self.root_uri = root_uri
        self.websocket = None
        self.cache = {}
        self.unmatched_responses = {}

        self._id = 0

    @property
    def id(self):
        self._id += 1
        return self._id

    def connect(self):
        uri = f"ws://{self.host}:{self.port}"
        self.websocket = ws.connect(uri)

    def initialize(self):
        initialize_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "initialize",
            "params": {
                "processId": None,
                "rootUri": self.root_uri,
                "capabilities": {},
            },
        }
        self.send_request(initialize_request)

    def send_request(self, request):
        req_key = (request["method"], json.dumps(request["params"]))
        request_id = request["id"]

        # Check if the request is already cached
        if req_key in self.cache:
            return self.cache[req_key]

        # Send the request
        self.websocket.send(json.dumps(request))

        return self.get_response(request_id, req_key)

    def get_response(self, request_id, req_key):
        # Check the response cache first
        if request_id in self.unmatched_responses:
            response = self.unmatched_responses.pop(request_id)
            self.cache[req_key] = response
            return response

        # Wait for the correct response ID
        while True:
            response = self.websocket.recv()
            response = json.loads(response)

            response_id = response.get("id")

            if response_id == request_id:
                self.cache[req_key] = response
                return response
            else:
                self.unmatched_responses[response_id] = response

    def get_document_symbols(self, document_uri):
        document_symbol_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "textDocument/documentSymbol",
            "params": {"textDocument": {"uri": document_uri}},
        }
        return self.send_request(document_symbol_request).get("result")

    def get_definition(self, document_uri, position):
        definition_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "textDocument/definition",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
            },
        }

        result = self.send_request(definition_request).get("result")
        if result:
            return result[0]
        return None

    def get_declaration(self, document_uri, position):
        declaration_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "textDocument/declaration",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
            },
        }
        result = self.send_request(declaration_request).get("result")
        if result:
            return result[0]
        return None

    def get_references(self, document_uri, position):
        reference_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "textDocument/references",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
                "context": {"includeDeclaration": False},
            },
        }
        return self.send_request(reference_request).get("result")

    def get_selection_range(self, document_uri, position):
        selection_range_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "textDocument/selectionRange",
            "params": {
                "textDocument": {"uri": document_uri},
                "position": position,
            },
        }
        return self.send_request(selection_range_request).get("result")

    def get_document_link(self, document_uri):
        document_link_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "textDocument/documentLink",
            "params": {"textDocument": {"uri": document_uri}},
        }
        return self.send_request(document_link_request).get("result")

    def shutdown_exit_close(self):
        self.shutdown()
        self.exit()
        self.close()

    def shutdown(self):
        shutdown_request = {
            "jsonrpc": "2.0",
            "id": self.id,
            "method": "shutdown",
            "params": None,
        }
        self.send_request(shutdown_request)

    def exit(self):
        exit_request = {"jsonrpc": "2.0", "method": "exit"}
        self.websocket.send(json.dumps(exit_request))

    def close(self):
        self.websocket.close()


def pretty_print(data):
    print(json.dumps(data, indent=2))


def main():
    lsp_caller = LspCaller(
        root_uri="file:///home/juan/devel/blar/lsp-poc/ruby-on-rails-sample-app",
        # port=7658,
    )
    lsp_caller.connect()


if __name__ == "__main__":
    main()
