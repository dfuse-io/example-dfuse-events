

# Get started with dfuse Events using REACT and Scatter

### dfuse Events example

This example demonstrates how to use `push_transaction` to the dfuseiohooks contract to index data fields in your smart contract. For more context, you can refer to the [contract example](https://github.com/dfuse-io/example-dfuse-events-contract).

### Token management

First, head on to our self-service API management [portal](https://app.dfuse.io), after signing up you will be able to create long-term API keys.
The token management is done by the [@dfuse/client](https://github.com/dfuse-io/client-js) library. For an example of token management implementation, refer to the [action rates streaming example](https://github.com/dfuse-io/example-stream-action-rates).

### Initializing the graphql client (apollo)

We use the [apollo client](https://www.apollographql.com/docs/react/) to connect to the graphQL server. You can install the apollo client and other required packages via:

```
yarn add apollo-boost graphql apollo-client apollo-link-ws react-apollo subscriptions-transport-ws
```

In our example, we instantiate the apollo client like follows:

```typescript
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { WebSocketLink } from "apollo-link-ws";
import { createDfuseClient } from "@dfuse/client";

const dfuseClient = createDfuseClient({
  network: "kylin",
  apiKey: "<your-api-key>"
});

const wsLink = new WebSocketLink({
  uri: `wss://kylin.eos.dfuse.io/graphql`,
  options: {
    reconnect: true,
    connectionParams: async () => {
      const token = await dfuseClient.getTokenInfo();
      return {
        Authorization: `Bearer ${token.token}`
      };
    }
  }
});

const apolloClient = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache()
});
```

### Connection to Scatter

In order to index your smart contract, you need to use `push_transaction` from an EOS account. To connect your EOS account in this example, we will use [Scatter](https://get-scatter.com/). The [scatter plugin](https://github.com/EOSIO/ual-scatter) can be initialized in the following way:

```typescript
import { Scatter } from "ual-scatter";

export const Config = {
  chainId: "5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191",
  chainApiProtocol: "https",
  chainApiHost: "kylin.eos.dfuse.io",
  chainApiPort: "443"
};

const scatter = new Scatter([blockchainConfig], { appName: "dfuse Events" });
```

## Add an index with push_transaction

The `push_transaction` method is used to generate the transaction that will index our fields:

```typescript
export function createDfuseHooksEventTransaction(
  actor: string,
  key: string,
  data: string
) {
  return {
    actions: [
      {
        account: "dfuseiohooks",
        name: "event",
        authorization: [
          {
            actor,
            permission: "active"
          }
        ],
        data: {
          key,
          data
        }
      }
    ]
  };
}

onPushTransaction = async (event: React.MouseEvent<HTMLInputElement>) => {
  const { accountName, activeUser, key, data } = this.state;

  const transaction = createDfuseHooksEventTransaction(accountName!, key, data);

  const signedTransaction = await activeUser.signTransaction(transaction, {
    broadcast: true
  });

  // ...
};
```

where the `activeUser` is provided inside the React application via the wrapper:

```typescript jsx
import { UALProvider, withUAL } from "ual-reactjs-renderer";

const WrappedApp = withUAL(App);

ReactDOM.render(
  <ApolloProvider client={apolloClient}>
    <UALProvider
      chains={[blockchainConfig]}
      authenticators={[scatter]}
      appName={"dfuse Events"}
    >
      <WrappedApp />
    </UALProvider>
  </ApolloProvider>,
  document.getElementById("root") as HTMLElement
);
```

and `data` is a string set by the react form which must follow the format:

```
fieldName1=foo&fieldName2=bar&...
```

### GraphQL query

- dfuse GraphQL documention can be found [here](https://docs.dfuse.io/#graphql)
- If you are not familiar with GraphQL. Take a look at [Introduction to GraphQL](https://graphql.org/learn/)
- To help you construct your query and access our api documentation you can use [GraphiQL](https://mainnet.eos.dfuse.io/graphiql/) _"A graphical interactive in-browser GraphQL IDE."_
  https://mainnet.eos.dfuse.io/graphiql/

### Build the graphQL subscription

We use the [gql](https://www.apollographql.com/docs/react/essentials/queries) function to build our subscription query:

```typescript
import gql from "graphql-tag";

export const searchSubscription = gql`
  subscription($searchQuery: String!) {
    searchTransactionsForward(query: $searchQuery, lowBlockNum: -500) {
      trace {
        id
        matchingActions {
          name
          account
          json
        }
      }
    }
  }
`;
```

### Use in react application

Apollo provides an `ApolloProvider` component to link the apollo client to the React application (see code samples above). Using the subscription query is as simple as passing it to the `Subscription` component (read [apollo doc](https://www.apollographql.com/docs/react/advanced/subscriptions) for more details). In this example, we created a react component to handle the various subscription states:

```typescript jsx
type SearchListProps = {
  searchQuery: string;
  renderLoading: () => React.ReactNode;
  renderError: (error: any) => React.ReactNode;
  renderResults: (results: any[]) => React.ReactNode;
};

export const SearchList: React.FC<SearchListProps> = ({
  searchQuery,
  renderLoading,
  renderError,
  renderResults
}) => (
  <Subscription subscription={searchSubscription} variables={{ searchQuery }}>
    {({ loading, error, data }) => {
      if (error !== undefined) {
        return renderError(error);
      }

      if (loading) {
        return renderLoading();
      }

      recordedMessages = [...recordedMessages.slice(-20), data];

      return renderResults(recordedMessages);
    }}
  </Subscription>
);
```

### Parsing server response

In this example, we only check that the transaction we pushed appears in our search results:

```typescript jsx
renderResults = (messages: any[]) => {
  const matching = messages.filter(message => {
    return (
      message.searchTransactionsForward.trace.id === this.state.transactionId
    );
  });

  if (matching.length === 0) {
    return (
      <code key="not-found" className="App-transfer">
        Waiting for transaction...
      </code>
    );
  }

  return matching.reverse().map(this.renderResult);
};
```

For the complete example, you can refer to the source code of this project.

### Query indexed fields with dfuse search API

Now that the action has been indexed, you can easily search for those only actions you are interested in.

- Search all move action that had `fieldName1` set to `foo` and `fieldName2` set to `bar` (using format example from above) with `event.fieldName1:foo event.fieldName2:bar parent.receiver:yourcontract`.

Important The parent.receiver:<contract> should always be used to ensure that it was really your <contract> that sent the inline action. You would not like someone doing the same card_id=123&card_kind=club fields indexing to be included in your search's results!


# Quick start to run the example

The following assumes you have yarn installed on your computer

- Clone this repository
- yarn install
- yarn start
- open `localhost:3000` in a new tab in your webbrowser

