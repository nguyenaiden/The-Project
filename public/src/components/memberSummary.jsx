import React from 'react';
import Util from '../lib/util.js';

class MemberSummary extends React.Component {
  constructor(props) {
    super(props);
    // this.state = {
    // };
    this.handleSubmit = this.handleSubmit.bind(this);
    // let data = this.state.dummyData;
    // let itemsArray = Object.keys(data.items_split);
  }

  

  handleSubmit(event) {
    // TODO: the dummyData will be passed down from MemberSummary's parent component
    event.preventDefault();
    // this.setState({dummyData});
    Util.insertIntoDb(dummyData);
  }



  pricePerPerson(totalCost,memberArray) {
    return (totalCost / memberArray.length)
  }

  
  render() {
    return (
      <div>
        <h4>{this.props.dummyData.trip}</h4>
        <h4>{this.props.dummyData.receiptName} {this.props.dummyData.receiptUrl}</h4>
        <h4>Paid By: {this.props.dummyData.payor}</h4>
        <ul>
          {Object.keys(this.props.dummyData.items_split).map((key,index) => {
            return (
              <li>
                <ul>{this.props.dummyData.items_split[key].item}
                  {this.props.dummyData.items_split[key].split.payees.map((item,index) => {
                    return (<li>{item}</li>)
                  })}
                </ul> 
              </li> 
            )  
          })}
        </ul>
        <input type="submit" value="Confirm"/>
      </div>
    )
  }
}

export default MemberSummary;