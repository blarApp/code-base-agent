from typing import Optional

from multilspy import SyncLanguageServer

from blarify.utils.path_calculator import PathCalculator

from .types.Reference import Reference
from blarify.graph.node import DefinitionNode
from blarify.code_hierarchy.languages import (
    PythonDefinitions,
    JavascriptDefinitions,
    RubyDefinitions,
    TypescriptDefinitions,
    LanguageDefinitions,
    CsharpDefinitions,
    GoDefinitions,
)

from multilspy.multilspy_config import MultilspyConfig
from multilspy.multilspy_logger import MultilspyLogger

import logging

logger = logging.getLogger(__name__)


class FileExtensionNotSupported(Exception):
    pass


class LspQueryHelper:
    root_uri: str
    language_to_lsp_server: dict[str, SyncLanguageServer]

    LSP_USAGES = 0

    def __init__(self, root_uri: str, host: Optional[str] = None, port: Optional[int] = None):
        self.root_uri = root_uri
        self.entered_lsp_servers = {}
        self.language_to_lsp_server = {}

    def _get_language_definition_for_extension(self, extension: str) -> LanguageDefinitions:
        if extension in PythonDefinitions.get_language_file_extensions():
            return PythonDefinitions
        elif extension in JavascriptDefinitions.get_language_file_extensions():
            return JavascriptDefinitions
        elif extension in TypescriptDefinitions.get_language_file_extensions():
            return TypescriptDefinitions
        elif extension in RubyDefinitions.get_language_file_extensions():
            return RubyDefinitions
        elif extension in CsharpDefinitions.get_language_file_extensions():
            return CsharpDefinitions
        elif extension in GoDefinitions.get_language_file_extensions():
            return GoDefinitions
        else:
            raise FileExtensionNotSupported(f'File extension "{extension}" is not supported)')

    def _create_lsp_server(self, language_definitions: LanguageDefinitions):
        language = language_definitions.get_language_name()

        config = MultilspyConfig.from_dict({"code_language": language})

        logger = MultilspyLogger()
        lsp = SyncLanguageServer.create(config, logger, PathCalculator.uri_to_path(self.root_uri))
        return lsp

    def start(self) -> None:
        """
        DEPRECATED, LSP servers are started on demand
        """

    def _get_or_create_lsp_server(self, extension):
        language_definitions = self._get_language_definition_for_extension(extension)
        language = language_definitions.get_language_name()

        if language in self.language_to_lsp_server:
            return self.language_to_lsp_server[language]
        else:
            new_lsp = self._create_lsp_server(language_definitions)
            self.language_to_lsp_server[language] = new_lsp
            self._initialize_lsp_server(language, new_lsp)
            return new_lsp

    def _initialize_lsp_server(self, language, lsp):
        context = lsp.start_server()
        context.__enter__()
        self.entered_lsp_servers[language] = context

    def initialize_directory(self, file) -> None:
        """
        DEPRECATED, LSP servers are started on demand
        """

    def get_paths_where_node_is_referenced(self, node: DefinitionNode) -> list[Reference]:
        server = self._get_or_create_lsp_server(node.extension)
        references = self._request_references_with_fallback(node, server)

        if not references:
            return []

        return [Reference(reference) for reference in references]

    def _request_references_with_fallback(self, node, lsp):
        try:
            references = lsp.request_references(
                file_path=PathCalculator.get_relative_path_from_uri(root_uri=self.root_uri, uri=node.path),
                line=node.definition_range.start_dict["line"],
                column=node.definition_range.start_dict["character"],
            )
        except TimeoutError:
            self._restart_lsp_for_extension(node)
            lsp = self._get_or_create_lsp_server(node.extension)
            references = lsp.request_references(
                file_path=PathCalculator.get_relative_path_from_uri(root_uri=self.root_uri, uri=node.path),
                line=node.definition_range.start_dict["line"],
                column=node.definition_range.start_dict["character"],
            )

        return references

    def _restart_lsp_for_extension(self, node):
        language_definitions = self._get_language_definition_for_extension(node.extension)

        new_lsp = self._create_lsp_server(language_definitions)

        logger.warning("Restarting LSP server")
        try:
            context = new_lsp.start_server()
            new_lsp = context.__enter__()
            self.language_to_lsp_server[language_definitions.get_language_name()] = new_lsp

        except ConnectionResetError:
            logger.error("Connection reset error")

        self.entered_lsp_servers[node.extension] = context

    def get_definition_path_for_reference(self, reference: Reference) -> str:
        lsp_caller = self._get_or_create_lsp_server(".py")
        definitions = lsp_caller.request_definition(
            file_path=PathCalculator.get_relative_path_from_uri(root_uri=self.root_uri, uri=reference.uri),
            line=reference.range.start.line,
            column=reference.range.start.character,
        )

        if not definitions:
            return ""

        return definitions[0]["uri"]

    def shutdown_exit_close(self) -> None:
        for lsp in self.entered_lsp_servers.values():
            try:
                lsp.__exit__(None, None, None)
            except Exception as e:
                logger.error(f"Error shutting down LSP: {e}")
        self.entered_lsp_servers = {}
        self.language_to_lsp_server = {}
        logger.info("LSP servers have been shut down")
