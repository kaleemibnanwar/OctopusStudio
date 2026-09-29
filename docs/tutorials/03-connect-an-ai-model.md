# Connect an AI model

## Cloud provider

1. Open **Settings → Model Providers**.
2. Select a provider such as OpenAI, Anthropic, Google, OpenRouter, Azure, Vertex, Bedrock, xAI, or MiniMax.
3. Enter the requested credentials and save.
4. Return to the **AI** section and select a default model.
5. Start a new chat and send a small prompt to verify the connection.

## Local provider

1. Install and start Ollama or LM Studio yourself; Octopus Studio does not manage that service.
2. In **Model Providers**, choose the matching provider and confirm its local endpoint/model configuration.
3. Select the local model as your default and test it in a new chat.

Cloud providers receive prompt content and any context sent to the model. A local provider keeps inference local, but connected plugins or deployment/database services can still make network requests.
