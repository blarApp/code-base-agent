from Graph.Node import Node, NodeLabels


class FolderNode(Node):
    def __init__(self, path: str):
        super().__init__(NodeLabels.FOLDER, path)
