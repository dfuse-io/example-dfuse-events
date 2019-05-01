import * as React from "react"
import { Config } from "./config"

import "./App.css"
import { createDfuseHooksEventTransaction } from "./transaction"
import { SearchList } from "./components/search-list"
import Button from "@material-ui/core/Button/Button"
import TextField from "@material-ui/core/TextField/TextField"
import Grid from "@material-ui/core/Grid/Grid"
import createMuiTheme from "@material-ui/core/styles/createMuiTheme"
import MuiThemeProvider from "@material-ui/core/styles/MuiThemeProvider"

type Props = {
  ual: any
}

type State = {
  activeUser?: any
  accountName?: string
  transactionId?: string
  streamResults: boolean

  key: string
  data: string
}

// @ts-ignore
const theme = createMuiTheme({
  palette: {
    primary: { main: "#ff4660" }
  },
  typography: { useNextVariants: true },
  overrides: {
    MuiButton: {
      containedPrimary: {
        paddingLeft: "40px",
        paddingRight: "40px",
        boxShadow: "none",
        textTransform: "none",

        "&:active": {
          boxShadow: "none"
        },
        "&:focus": {
          boxShadow: "0 0 0 0.2rem rgba(0,123,255,.5)"
        }
      },
      label: {
        fontWeight: 600
      }
    }
  }
})

class App extends React.Component<Props, State> {
  state: State = {
    key: "",
    data: "",
    streamResults: false
  }

  componentDidUpdate() {
    const {
      ual: { activeUser }
    } = this.props

    if (activeUser && !this.state.activeUser) {
      console.log("Updating active user")
      this.setState({ activeUser }, this.onActiveUserUpdate)
    } else if (!activeUser && this.state.activeUser) {
      this.setState({ activeUser: undefined })
    }
  }

  onDataUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ data: event.target.value })
  }

  onActiveUserUpdate = async (): Promise<void> => {
    try {
      const accountName = await this.state.activeUser.getAccountName()
      this.setState({ accountName })
    } catch (e) {
      console.log("An error occurred updating active user", e)
    }
  }

  onPushTransaction = async (event: React.MouseEvent<HTMLInputElement>) => {
    event.preventDefault()
    console.log("Pushing transaction")

    const { accountName, activeUser, key, data } = this.state
    if (activeUser === undefined) {
      this.props.ual.showModal()
      return
    }

    try {
      this.setState({ streamResults: true })

      const transaction = createDfuseHooksEventTransaction(accountName!, key, data)
      const signedTransaction = await activeUser.signTransaction(transaction, { broadcast: true })

      this.setState({ transactionId: signedTransaction.transactionId })
    } catch (error) {
      console.log("An error occurred while trying to push transaction", error)
    }
  }

  renderForm() {
    return (
      <Grid sm={4} item={true}>
        <div style={{ padding: 12 }}>
          <Grid container={true} spacing={24} direction="column">
            <Grid className="App-no-padding-x" item={true} sm={12}>
              <h2 style={{ textAlign: "left" }}>dfuse events</h2>
            </Grid>
            <Grid className="App-no-padding-x" item={true} sm={12}>
              <TextField
                fullWidth={true}
                label="Data"
                variant="outlined"
                type="text"
                name="data"
                onChange={this.onDataUpdate}
              />
            </Grid>
            <Grid
              className="App-no-padding-x"
              item={true}
              style={{ textAlign: "left" }}
              sm={12}
            >
              <Button
                color="primary"
                variant="contained"
                type="submit"
                onClick={this.onPushTransaction}
              >
                Submit
              </Button>
            </Grid>
          </Grid>
        </div>
      </Grid>
    )
  }

  renderTransaction() {
    const { transactionId } = this.state
    if (!transactionId) {
      return null
    }
    return (
      <a target="_blank" href={`${Config.chainApiProtocol}://kylin.eosq.app/tx/${transactionId}`}>
        See it on eosq
      </a>
    )
  }

  renderSearchResults = () => {
    if (!this.state.streamResults) {
      return null
    }

    const { data } = this.state
    const entries = data.split("&")
    const searchFields = entries.map((entry) => {
      const parts = entry.split("=")

      return `event.${parts[0]}:${parts[1]}`
    })

    const query = searchFields.join(" ")

    return (
      <div className="App-infinite-container">
        <SearchList
          searchQuery={query}
          renderLoading={this.renderLoading}
          renderError={this.renderError}
          renderResults={this.renderResults}
        />
      </div>
    )
  }

  renderLoading = () => {
    return <h2>Loading ....</h2>
  }

  renderError = (error: any) => {
    return <h2>Error!</h2>
  }

  renderResult = (result: any, index: number) => {
    const trace = result.searchTransactionsForward.trace
    const matchingAction = trace.matchingActions[0]

    const prefixTrxId = trace.id.slice(0, 8)
    const suffixTrxId = trace.id.slice(-8)

    return (
      <code key={index} className="App-transfer">
        {`${matchingAction.account}:${matchingAction.name} - ${JSON.stringify(
          matchingAction.json
        )} (${prefixTrxId}...${suffixTrxId})`}
      </code>
    )
  }

  renderResults = (messages: any[]) => {
    const matching = messages.filter((message) => {
      return message.searchTransactionsForward.trace.id === this.state.transactionId
    })

    if (matching.length === 0) {
      return (
        <code key="not-found" className="App-transfer">
          Waiting for transaction...
        </code>
      )
    }

    return matching.reverse().map(this.renderResult)
  }

  render() {
    return (
      <div className="App">
        <MuiThemeProvider theme={theme}>
          <div className="App-container">
            <Grid container={true} spacing={32}>
              {this.renderForm()}
              <Grid xs={8} item={true}>
                {this.renderTransaction()}
                {this.renderSearchResults()}
              </Grid>
            </Grid>
          </div>
        </MuiThemeProvider>
      </div>
    )
  }
}

export default App
