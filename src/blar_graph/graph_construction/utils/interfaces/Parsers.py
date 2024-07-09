from blar_graph.graph_construction.core.base_parser import BaseParser
from blar_graph.graph_construction.languages.javascript.javascript_parser import (
    JavascriptParser,
)
from blar_graph.graph_construction.languages.python.python_parser import PythonParser
from blar_graph.graph_construction.languages.typescript.typescript_parser import (
    TypescriptParser,
)


class Parsers(object):
    python: PythonParser
    javascript: JavascriptParser
    typescript: TypescriptParser

    def __init__(self):
        self.python = PythonParser()
        self.javascript = JavascriptParser()
        self.typescript = TypescriptParser()

    def get_parser(self, path: str) -> BaseParser:
        extension = path[path.rfind(".") :]
        if extension == ".py":
            return self.python
        elif extension == ".js" or extension == ".jsx":
            return self.javascript
        elif extension == ".ts" or extension == ".tsx":
            return self.typescript
        else:
            return None
