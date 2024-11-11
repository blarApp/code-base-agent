import tree_sitter_typescript as tstypescript

from .javascript_definitions import JavascripLanguageDefinitions

from tree_sitter import Language, Parser
from typing import Dict


class TypescriptDefinitions(JavascripLanguageDefinitions):
    def get_parsers_for_extensions() -> Dict[str, Parser]:
        parsers = {
            ".ts": Parser(Language(tstypescript.language_typescript())),
            ".tsx": Parser(Language(tstypescript.language_tsx())),
        }

        parsers = {**parsers, **JavascripLanguageDefinitions.get_parsers_for_extensions()}

        return parsers

    def get_language_file_extensions():
        return {".ts", ".tsx", ".js", ".jsx"}
