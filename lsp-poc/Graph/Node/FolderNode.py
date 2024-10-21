from Graph.Node import Node, NodeLabels


class FolderNode(Node):
    def __init__(self, path: str):
        super().__init__(NodeLabels.FOLDER, path)

    def __str__(self):
        return f"{self.label}({self.path})"
