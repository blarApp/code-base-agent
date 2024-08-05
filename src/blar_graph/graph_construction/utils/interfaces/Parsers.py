from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.languages.javascript.javascript_parser import (
    JavascriptParser,
)
from blar_graph.graph_construction.languages.javascript.jsx_parser import JsxParser
from blar_graph.graph_construction.languages.python.python_parser import PythonParser
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

    def __init__(self, global_graph_info: GlobalGraphInfo):
        self.python = PythonParser(global_graph_info)
        self.javascript = JavascriptParser(global_graph_info)
        self.typescript = TypescriptParser(global_graph_info)
        self.tsx = TsxParser(global_graph_info)
        self.jsx = JsxParser(global_graph_info)

    def get_parser(self, path: str) -> BaseParser | None:
        extension = path[path.rfind(".") :]
        if extension == ".py":
            return self.python
        elif extension == ".js" or extension == ".jsx":
            return self.javascript
        elif extension == ".ts":
            return self.typescript
        elif extension == ".tsx":
            return self.tsx
        elif extension == ".jsx":
            return self.jsx
        else:
            return None
