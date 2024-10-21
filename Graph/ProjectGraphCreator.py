from LSP import LspCaller


class ProjectGraphCreator:
    def __init__(self, root_path: str, lsp_caller: LspCaller):
        self.lsp_caller = lsp_caller
        self.root_path = root_path
        self.nodes = []
        self.relationships = []

    def build(self):
        self.build_nodes()
        self.build_relationships()

    def build_nodes(self):
        pass

    def build_relationships(self):
        pass

    def print(self):
        self.print_nodes()
        self.print_relationships()

    def print_nodes(self):
        for node in self.nodes:
            print(node)

    def print_relationships(self):
        for rel in self.relationships:
            print(rel)
