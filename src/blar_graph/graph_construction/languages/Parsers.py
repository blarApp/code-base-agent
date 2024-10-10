import os

from blar_graph.graph_construction.languages.base_alias_extractor import (
    BaseAliasExtractor,
)
from blar_graph.graph_construction.languages.base_parser import BaseParser
from blar_graph.graph_construction.languages.javascript.javascript_parser import (
    JavascriptParser,
)
from blar_graph.graph_construction.languages.javascript.jsx_parser import JsxParser
from blar_graph.graph_construction.languages.python.python_parser import PythonParser
from blar_graph.graph_construction.languages.ruby.ruby_parser import RubyParser
from blar_graph.graph_construction.languages.typescript.tsx_parser import TsxParser
from blar_graph.graph_construction.languages.typescript.typescript_parser import (
    TypescriptParser,
)
from blar_graph.graph_construction.utils.interfaces.GlobalGraphInfo import (
    GlobalGraphInfo,
)


class Parsers(object):
    python: PythonParser
    javascript: JavascriptParser
    typescript: TypescriptParser
    tsx: TsxParser
    jsx: JsxParser
    ruby: RubyParser
    alias_extractor: BaseAliasExtractor = BaseAliasExtractor()

    def __init__(self, global_graph_info: GlobalGraphInfo, root_path: str):
        self.python = PythonParser(global_graph_info)
        self.javascript = JavascriptParser(global_graph_info)
        self.typescript = TypescriptParser(global_graph_info)
        self.tsx = TsxParser(global_graph_info)
        self.jsx = JsxParser(global_graph_info)
        self.ruby = RubyParser(global_graph_info)
        self._run_precompute_tasks(root_path, global_graph_info)

    def get_parser(self, path: str) -> BaseParser | None:
        extension = path[path.rfind(".") :]
        if extension == ".py":
            return self.python
        elif extension == ".js":
            return self.javascript
        elif extension == ".ts":
            return self.typescript
        elif extension == ".tsx" or extension == ".jsx":  # Treat .jsx as .tsx
            return self.tsx
        else:
            return None

    def _run_precompute_tasks(self, root_path: str, global_graph_info: GlobalGraphInfo):
        self.parse_alias_files(root_path, global_graph_info)
        self.ruby._precompute_autoloaded_modules(root_path, global_graph_info)

    # TODO: Refactor this method to be more generic
    # This is made to be able to precompute aliases on TypeScript and Javascript projects
    def parse_alias_files(self, root_path: str, global_graph_info: GlobalGraphInfo):
        for root, _, files in os.walk(root_path):
            for file in files:
                if file in self.alias_extractor.alias_extractors:
                    aliases = self.alias_extractor.extract_aliases(os.path.join(root, file))
                    global_graph_info.aliases.update(aliases)
