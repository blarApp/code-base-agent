from .LspCaller import LspCaller
from Files import File
from .SymbolKind import SymbolKind
from Graph.Node import NodeFactory


class SymbolGetter:
    @staticmethod
    def get_symbol_start_position(symbol: dict):
        return symbol["location"]["range"]["start"]

    @staticmethod
    def get_symbol_uri(symbol: dict):
        return symbol["location"]["uri"]

    @staticmethod
    def get_symbol_kind_as_SymbolKind(symbol: dict):
        return SymbolKind(symbol["kind"])

    @staticmethod
    def get_symbol_name(symbol: dict):
        return symbol["name"]


class DefinitionGetter:
    @staticmethod
    def get_definition_uri(definition: dict):
        return definition["uri"]


class LspQueryHelper:
    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    def start(self):
        self.lsp_caller.connect()
        self.lsp_caller.initialize()

    def create_nodes_and_relationships(self, file: File):
        symbols = self.lsp_caller.get_document_symbols(file.uri_path).get("result")

        for symbol in symbols:
            start_position = SymbolGetter.get_symbol_start_position(symbol)
            uri = SymbolGetter.get_symbol_uri(symbol)
            kind = SymbolGetter.get_symbol_kind_as_SymbolKind(symbol)

            definition = self.lsp_caller.get_definition(uri, start_position).get(
                "result"
            )

            definition_uri = DefinitionGetter.get_definition_uri(definition)

    def get_symbols_declared_in_file(self, file: File):
        self.lsp_caller.get_document_symbols(file.uri_path)

    def get_reference_of_symbol(self, file: File, position):
        self.lsp_caller.get_references(file.uri_path, position)
