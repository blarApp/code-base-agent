class GlobalGraphInfo:
    visited_nodes: dict
    imports: dict
    import_aliases: dict
    inheritances: dict
    company_id: str

    def __init__(self, company_id: str):
        self.visited_nodes = {}
        self.imports = {}
        self.import_aliases = {}
        self.inheritances = {}
        self.company_id = company_id
