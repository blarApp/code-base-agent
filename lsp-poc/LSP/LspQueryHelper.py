from .LspCaller import LspCaller
from Files import File
from .SymbolKind import SymbolKind
from Graph.Node import NodeFactory, FileNode, Node, DefinitionRange
from Graph.Relationship import RelationshipCreator, RelationshipType
import asyncio

from typing import List


class SymbolGetter:
    @staticmethod
    def get_symbol_start_position(symbol: dict):
        return symbol["location"]["range"]["start"]

    @staticmethod
    def get_symbol_end_position(symbol: dict):
        return symbol["location"]["range"]["end"]

    @staticmethod
    def get_symbol_uri(symbol: dict):
        return symbol["location"]["uri"]

    @staticmethod
    def get_symbol_kind_as_SymbolKind(symbol: dict):
        return SymbolKind(symbol["kind"])

    @staticmethod
    def get_symbol_name(symbol: dict):
        return symbol["name"]

    @staticmethod
    def get_symbol_start_line(symbol: dict):
        return symbol["location"]["range"]["start"]["line"]

    @staticmethod
    def get_symbol_end_line(symbol: dict):
        return symbol["location"]["range"]["end"]["line"]


class DefinitionGetter:
    @staticmethod
    def get_definition_uri(definition: dict):
        return definition["uri"]

    @staticmethod
    def get_definition_range(definition: dict):
        return definition["range"]


class LspQueryHelper:
    def __init__(self, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller

    async def _aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.shutdown_exit_close()

    def start(self):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self._start())

    async def _start(self):
        await self.lsp_caller.connect()
        await self.lsp_caller.initialize()

    async def get_paths_where_node_is_referenced(self, node: Node):
        references = await self.lsp_caller.get_references(
            node.path, node.definition_range.start_dict
        )
        # print(node.path, node.definition_range, node.label)
        if not references:
            return []
        return self._get_references_paths(references)

    def _get_references_paths(self, references: List[dict]):
        return [reference["uri"] for reference in references]

    def shutdown_exit_close(self):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self._shutdown_exit_close())

    async def _shutdown_exit_close(self):
        await self.lsp_caller.shutdown_exit_close()
