from .LspCaller import LspCaller
from Files import File


class LspQueryHelper:
    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self):
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    def get_imports(self, file: File):
        response = self.lsp_caller.get_document_symbols(file.uri_path)

        document_symbols = response.get("result", [])

        for symbol in document_symbols:
            print(symbol.get("name"))

        return document_symbols
