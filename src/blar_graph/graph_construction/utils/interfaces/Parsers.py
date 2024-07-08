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
