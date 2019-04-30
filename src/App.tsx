import * as React from "react"
import { Config } from "./config"

import "./App.css"
import { createDfuseHooksEventTransaction } from "./transaction"
import {SearchList} from "./components/search-list";




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

  onKeyUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ key: event.target.value })
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
      console.log(transaction)
      console.log(activeUser)
      const response = await activeUser.signTransaction(transaction, { broadcast: true })
      console.log(response)

      this.setState({ transactionId: response.transactionId })
    } catch (error) {
      console.log("An error occurred while trying to push transaction", error)
    }
  }

  renderForm() {
    return (
      <React.Fragment>
        <h2>dfuse Events</h2>
        <form className="App-form">
          <div>
            <label>
              Key:
              <input type="text" name="key" className="App-key-field" onChange={this.onKeyUpdate} />
            </label>
          </div>
          <div>
            <label>
              Data:
              <input
                type="text"
                name="data"
                className="App-data-field"
                onChange={this.onDataUpdate}
              />
            </label>
          </div>
          <div>
            <input
              className="App-button"
              type="submit"
              value="Submit"
              onClick={this.onPushTransaction}
            />
          </div>
        </form>
      </React.Fragment>
    )
  }

  renderTransaction() {
    const { transactionId } = this.state

    return (
      <a target="_blank" href={`${Config.chainApiProtocol}://kylin.eosq.app/tx/${transactionId}`}>
        {transactionId}
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
    const traces = result.searchTransactionsForward.trace
    const matchingAction = traces.matchingActions[0]



    const prefixTrxId = traces.id.slice(0, 8)
    const suffixTrxId = traces.id.slice(-8)

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
          Transaction not found, still looking for it
        </code>
      )
    }

    return matching.reverse().map(this.renderResult)
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          {this.renderForm()}
          <main className="App-main">
            {this.renderTransaction()}
            {this.renderSearchResults()}
          </main>
        </header>
      </div>
    )
  }
}

export default App
