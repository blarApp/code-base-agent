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


class Parsers(object):
    python: PythonParser
    javascript: JavascriptParser
    typescript: TypescriptParser
    tsx: TsxParser
    jsx: JsxParser

    def __init__(self):
        self.python = PythonParser()
        self.javascript = JavascriptParser()
        self.typescript = TypescriptParser()
        self.tsx = TsxParser()
        self.jsx = JsxParser()

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
