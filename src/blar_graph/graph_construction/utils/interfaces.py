class GlobalGraphInfo:
    visited_nodes: dict
    imports: dict
    import_aliases: dict
    inheritances: dict

    def __init__(self):
        self.visited_nodes = {}
        self.imports = {}
        self.import_aliases = {}
        self.inheritances = {}
