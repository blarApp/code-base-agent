from typing import Optional
from .lsp_caller import LspCaller
from .types.Reference import Reference
from blarify.graph.node import DefinitionNode
from .implemented_lsp import ImplementedLsp
from blarify.code_hierarchy.languages import (
    PythonDefinitions,
    JavascriptDefinitions,
    RubyDefinitions,
    TypescriptDefinitions,
    LanguageDefinitions,
)
from collections import ChainMap


class FileExtensionNotSupported(Exception):
    pass


class LspQueryHelper:
    root_uri: str
    lsp_callers: dict[ImplementedLsp, LspCaller]

    def __init__(self, root_uri: str, host: Optional[str] = None, port: Optional[int] = None):
        self.root_uri = root_uri
        self.lsp_callers = self._create_lsp_callers(host=host, port=port)
        self.extension_to_lsp_server = self._create_extensions_to_lsp_servers()

    def _create_lsp_callers(self, host: str, port: int) -> dict[ImplementedLsp, LspCaller]:
        return {
            lsp_server: LspCaller(root_uri=self.root_uri, lsp_server_name=lsp_server.value, host=host, port=port)
            for lsp_server in ImplementedLsp
        }

    def _create_extensions_to_lsp_servers(self):
        return ChainMap(
            self._create_extension_to_lsp_servers(PythonDefinitions, ImplementedLsp.JEDI_LANGUAGE_SERVER),
            self._create_extension_to_lsp_servers(JavascriptDefinitions, ImplementedLsp.TYPESCRIPT_LANGUAGE_SERVER),
            self._create_extension_to_lsp_servers(TypescriptDefinitions, ImplementedLsp.TYPESCRIPT_LANGUAGE_SERVER),
            self._create_extension_to_lsp_servers(RubyDefinitions, ImplementedLsp.SOLARGRAPH),
        )

    def _create_extension_to_lsp_servers(self, language_definitions: LanguageDefinitions, lsp_server: ImplementedLsp):
        return {extension: lsp_server for extension in language_definitions.get_language_file_extensions()}

    def start(self) -> None:
        for lsp_caller in self.lsp_callers.values():
            lsp_caller.connect()
            lsp_caller.initialize()

    def initialize_directory(self, file) -> None:
        lsp_caller = self.get_lsp_caller_for_extension(file.extension)
        lsp_caller.did_open(document_uri=file.uri_path, text=self._read_file(file.path), extension=file.extension)

    def get_lsp_caller_for_extension(self, extension: str) -> LspCaller:
        try:
            return self.lsp_callers[self.extension_to_lsp_server[extension]]
        except KeyError:
            raise FileExtensionNotSupported(f'File extension "{extension}" is not supported')

    def _read_file(self, file_path: str) -> str:
        try:
            with open(file_path, "r") as file:
                return file.read()
        except UnicodeDecodeError:
            return ""

    def get_paths_where_node_is_referenced(self, node: DefinitionNode) -> list[Reference]:
        print("get_paths_where_node_is_referenced")
        lsp_caller = self.get_lsp_caller_for_extension(node.extension)
        references = lsp_caller.get_references(node.path, node.definition_range.start_dict)
        if not references:
            return []
        return [Reference(reference) for reference in references]

    def get_definition_path_for_reference(self, reference: Reference) -> str:
        lsp_caller = self.get_lsp_caller_for_extension(".py")
        definition = lsp_caller.get_definition(reference.uri, reference.start_dict)
        return definition["uri"] if definition else ""

    def shutdown_exit_close(self) -> None:
        for lsp_caller in self.lsp_callers.values():
            lsp_caller.shutdown_exit_close()
