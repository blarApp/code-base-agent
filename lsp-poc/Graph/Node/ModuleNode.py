from Graph.Node import Node, NodeLabels


class ModuleNode(Node):
    def __init__(self, path: str, name: str):
        super().__init__(NodeLabels.MODULE, path)
        self.name = name

    def __str__(self):
        return f"{self.label}({self.path})#{self.name}"
