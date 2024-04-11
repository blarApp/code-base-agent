# code-base-agent

## Introduction

This repo introduces a method to represent a local code repository as a graph structure. The objective is to allow an LLM to traverse this graph to understand the code logic and flow. Providing the LLM with the power to debug, refactor, and optimize queries. However, several tasks are yet unexplored.

## Technology Stack

We used a combination of `llama-index`, `CodeHierarchy` module, and `tree-sitter-languages` for parsing code into a graph structure, `Neo4j` for storing and querying the graph data, and `langchain` to create the agents.

## Installation

**Install the package:**

```shell
pip install blar-graph
```

Set the env variables

```.env
NEO4J_URI=neo4j+s://YOUR_NEO4J.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=YOUR_NEO4J_PASSWORD
OPENAI_API_KEY=YOUR_OPEN_AI_KEY
```

If you are new to Neo4j you can deploy a free instance of neo4j with [Aura](https://login.neo4j.com/u/signup/identifier?state=hKFo2SBIWW01eGl6SEhHVTVZQ2g1VU9rSk1BZlVVblJPd2FzSqFur3VuaXZlcnNhbC1sb2dpbqN0aWTZIFNSUXR5UEtwZThoQTBlOWs0ck1hN0ZTekFOY3JfWkNho2NpZNkgV1NMczYwNDdrT2pwVVNXODNnRFo0SnlZaElrNXpZVG8). Also you can host your own version in [AWS](https://aws.amazon.com/marketplace/seller-profile?id=23ec694a-d2af-4641-b4d3-b7201ab2f5f9) or [GCP](https://console.cloud.google.com/marketplace/product/endpoints/prod.n4gcp.neo4j.io?rapt=AEjHL4O-iQH8W8STKpH0_zwz8HEyQqA9XFkpnFUkJotAt2wAT0Zmjhraww8X6covdYdzJdUi_LwtQtG8qDChLOLYHeEG4x1kZyhfzukM2WkabnwQlQpu5ws&project=direct-album-395214)

### Quick start guide

To build the graph, you have to instantiate the graph manager and constructor. The graph manager handles the connection with Neo4j, and the graph constructor processes the directory input to create the graph.

```python
from blar_graph.graph_construction.graph_builder import GraphConstructor
from blar_graph.graph_construction.neo4j_manager import Neo4jManager

graph_manager = Neo4jManager()
graph_constructor = GraphConstructor(graph_manager)
graph_constructor.build_graph("YOUR_LOCAL_DIRECTORY", "python")
graph_manager.close()
```

Now you can use our agent tools, or build your own, to create agents that resolves specific tasks. In the folder 'agents_tools' you will find all our tools (for now is just the Keyword search) and examples of agent implementations. For example, for a debugger agent you could do:

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents.format_scratchpad.openai_tools import (
    format_to_openai_tool_messages,
)
from langchain.agents.output_parsers.openai_tools import (
    OpenAIToolsAgentOutputParser,
)
from blar_graph.agents_tools.tools.KeywordSearchTool import KeywordSearchTool
from blar_graph.db_managers.base_manager import BaseDBManager
from langchain.agents import AgentExecutor
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0)

system_prompt = """
    You are a code debugger, Given a problem description and an initial function, you need to find the bug in the code.
    You are given a graph of code functions,
    We purposly omitted some code If the code has the comment '# Code replaced for brevity. See node_id ..... '.
    You can traverse the graph by calling the function keword_search.
    Prefer calling the function keword_search with query = node_id, only call it with starting nodes or neighbours.
    Explain why your solution solves the bug. Extensivley traverse the graph before giving an answer
"""


prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            system_prompt,
        ),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ]
)

tools = [KeywordSearchTool(db_manager=graph_manager)]
llm_with_tools = llm.bind_tools(tools)

agent = (
    {
        "input": lambda x: x["input"],
        "agent_scratchpad": lambda x: format_to_openai_tool_messages(
            x["intermediate_steps"]
        ),
    }
    | prompt
    | llm_with_tools
    | OpenAIToolsAgentOutputParser()
)
```

Now you can ask your agent to perform a debugging process.

```python
list(
    agent.stream(
        {
            "input": """
            The directory nodes generates multiples connections,
            it doesn't distinguish between different directories, can you fix it?
            The initial functions is run
            """
        }
    )
)
```

You can find more examples in the folder 'examples'. They are comprehensive jupiter notebooks that guide you from creating the graph to deploying the agent.

_*Note: The supported language for now is python, we are going to include Typescript (or other language) if you ask for it enough. So don't hesitate to reach out through the [issues](https://github.com/blarApp/code-base-agent/issues) or directly to benjamin@blar.io or jose@blar.io*_
