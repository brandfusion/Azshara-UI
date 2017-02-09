var h =  {
  rando : function(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
  getQueryVariable: function(variable){
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
  },
  validateNumber: function(s) {
    var rgx = /^[0-9]*\.?[0-9]*$/;
    return s.match(rgx);
  }
};  


var Order = React.createClass({
  getInitialState: function(){
    return {
      data: {},
      order: ""      
    };
  },
  componentWillMount: function() {  
    $('#order-detail').fadeOut(0); 
    var orderId = h.getQueryVariable("orderId");
    var link = "/Files/Extra/EditOrder.ashx?orderId=" + orderId;
    this.serverRequest = $.getJSON(link, function(result) { 
        var data = result.EditOrder;
        this.setState({data: data}); 
        this.setState({order: orderId});     
    }.bind(this));    

    $('#order-detail').fadeIn(1000);

    //Adds Stock to Lines after ajax call
    var that = this;
    $.ajax({
      url: '/files/extra/editorderstock.ashx?type=order&orderid=' +  orderId,
      type: 'GET',
      dataType: 'json'
    })
    .done(function(response) {
      var data = that.state.data;
      var Lines = data.Lines;
      var LinesWithStock = [];

      _.map(response, function(o){
        var line = _.filter(Lines, function(line){ return line.Id == o.Id});
        line[0].Stock = o.Stock;
          LinesWithStock.push(line[0]);
      });
      data.Lines = LinesWithStock
      that.setState({data: data}); 
    })
    .fail(function() {
      console.log("error");
    });


    
  }, 
  componentWillUnmount: function() {
    this.serverRequest.abort();
  },
  deleteLine: function(index, orderlineId) { 
    var that = this;
    var link = "/Files/Extra/EditOrder.ashx?type=DELETE&orderLineId=" + orderlineId + "&orderId=" + this.state.order;
    loader(true);
    $.ajax({
      url: link,
      type: 'POST',
      cache: false
    })
    .done(function(response) {
      var data = that.state.data;
      var arr = data.Lines;
      var orderInfo = response.OrderInfo;
      arr.splice(index, 1);        
      data.Lines = arr;
      that.setState({data: data});
      that.updateTotals(orderInfo.ShippingFee,orderInfo.Price,orderInfo.PriceWithVat);
      setTimeout(function(){
        loader(false);
      },1000);
      // console.log("line deleted");
    })
    .fail(function() {
     console.log("error deleting line");
    });
  },
  updateLine: function(index, UnitPrice, Quantity, OrderLineId, ProductCode, VariantNumber) {
    var link = "/Files/Extra/EditOrder.ashx?type=PUT";
    var sendObject = {};
    sendObject.UnitPrice = parseFloat(UnitPrice);
    sendObject.Quantity = parseInt(Quantity);
    sendObject.OrderLineId = OrderLineId;
    sendObject.ProductCode = ProductCode;
    sendObject.VariantNumber = VariantNumber;
    sendObject.OrderId = this.state.order;
    var sendData = JSON.stringify(sendObject);    
    var that = this;   
    loader(true);
    $.ajax({
      url: link,
      type: 'POST',     
      contentType: "application/json",
      data: sendData,
      cache: false
    })
    .done(function(response) {
      // console.log("line updated");
      var data = that.state.data;
      var arr = data.Lines;
      var orderInfo = response.OrderInfo;
      arr[index] = response.Line;   
      data.Lines = arr;
      that.setState({data: data});
      that.updateTotals(orderInfo.ShippingFee,orderInfo.Price,orderInfo.PriceWithVat);
      that.refreshData();
      setTimeout(function(){

        loader(false);
      },1000);
    })
    .fail(function() {
      console.log("error updating line");
    });  
  },
  updateTotals: function(ShippingFee, totalWithoutVAT, totalWithVAT) {
    var data = this.state.data;
    data.ShippingFee = ShippingFee;
    data.Price = totalWithoutVAT;
    data.PriceWithVat = totalWithVAT;
    this.setState({data: data});

  },
  refreshData: function(){
    var linkReloadCart = "/Files/Extra/EditOrder.ashx?orderId=" + this.state.order;  
    var that = this; 
    var orderId = h.getQueryVariable("orderId");
    loader(true);  

    //Adds Stock to Lines after ajax call
    $.ajax({
      url: linkReloadCart,
      type: 'GET',
      dataType: 'json',
      cache: false
    })
    .done(function(result) {
      var data = result.EditOrder;
      // console.log("after add line");
      // console.log(that.state.data);        
      that.setState({data: data}); 



      $.ajax({
        url: '/files/extra/editorderstock.ashx?type=order&orderid=' +  orderId,
        type: 'GET',
        dataType: 'json'
      })
      .done(function(response) {
        var data = that.state.data;
        var Lines = data.Lines;
        var LinesWithStock = [];

        _.map(response, function(o){
          var line = _.filter(Lines, function(line){ return line.Id == o.Id});
          line[0].Stock = o.Stock;
            LinesWithStock.push(line[0]);
        });
        data.Lines = LinesWithStock
        that.setState({data: data}); 
      })
      .fail(function() {
        console.log("error");
      });




      setTimeout(function(){
        loader(false);
      },1000);
    })
    .fail(function() {
      console.log("error loading order");
    });


  },
  addLine: function(itemcode, productnumber, variantInfo){
    var that = this;   
    var link = " /Files/Extra/EditOrder.ashx?type=POST";
    var sendObject = {};
    sendObject.UnitPrice = null; 
    sendObject.Quantity = 1; 
    sendObject.ProductCode = itemcode;
    sendObject.VariantNumber = productnumber;
    sendObject.VariantInfo = variantInfo;
    sendObject.OrderId = this.state.order;
    sendObject.Reference = "";    
    console.log(sendObject);
    var sendData = JSON.stringify(sendObject);
    $.ajax({
      url: link,
      type: 'POST',     
      contentType: "application/json",
      data: sendData,
      cache: false
    })
    .done(function(response) { 
      that.refreshData();
    })
    .fail(function() {
      console.log("error adding line");
    });  

  },
  eachItem: function(item, i) {
    var invalid = false;
    if (item.Quantity > item.Stock || item.Stock === null) {
      invalid = true;
    }
    return (
      <Orderline key={item.Id} index={i} source={item} deleteLine={this.deleteLine} updateLine={this.updateLine} invalid={invalid} />  
    );
  },
  loadScripts: function(){
    $('#order-detail').fadeOut(0);
    $('#order-detail').fadeIn(600);
  },
  render: function(){   
    var lines = this.state.data.Lines;
    if (lines === undefined) {
      lines = [];
    }    
    // console.log("render");
    // console.log(this.state.data); 
    return (       
       <div id="order-detail">
        <div className="col-xs-12"> <h2>Order {this.state.order} - {this.state.data.CustomerCompany}</h2> {this.state.data.DeliveryAddress} | {this.state.data.DeliveryName} | {this.state.data.DeliveryEmail}</div>
        <div className="col-xs-12">
          <div className="alert alert-danger" role="alert"><strong>ATENTIE!</strong> Toate modificarile se efectueaza in timp real.</div>
        </div>
        <div className="col-xs-12">         
            <table width="100%" className="table table-stripped">
              <thead>
                <tr>
                  <th>Produse</th>
                  <th>Pret Unitar</th>
                  <th>Cantitate</th>
                  <th>Stoc</th>
                  <th>Pret Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(this.eachItem)}
                <AddOrderlineItem addLine={this.addLine} />
              </tbody>
            </table>
                   
        </div>
        <div className="col-xs-12">
          <p><strong>Taxa transport: {this.state.data.ShippingFee} Lei</strong></p>
          <p><strong>Pret total(fara TVA): {this.state.data.Price} Lei</strong></p>
          <p><strong>Pret total(cu TVA): {this.state.data.PriceWithVat} Lei</strong></p>
        </div>              
      </div>
    );
   
    
  }

});
var Orderline = React.createClass({ 
  getInitialState: function(){
    return {
      data: [],
      index: null      
    };
  }, 
  componentDidMount: function(){   
    var that = this;    
    this.setState({data: this.props.source});
    this.setState({index: this.props.index});    
  }, 
  // componentWillReceiveProps: function(source){
  //   // console.log(this.props);

  //   this.setState({data: source.source});
  // },
  updateLine: function(e){
    e.preventDefault();
    var index = this.state.index;
    var OrderLineId = this.state.data.Id;
    var ProductCode = this.state.data.ProductCode; 
    var VariantNumber = this.state.data.VariantNumber; 
    var UnitPrice = this.state.data.UnitPrice;
    var Quantity = this.state.data.Quantity; 
    this.props.updateLine(index, UnitPrice, Quantity, OrderLineId, ProductCode, VariantNumber);   
  },
  deleteLine: function(e){
    e.preventDefault();   
    var index = this.state.index; 
    var orderlineId = this.state.data.Id; 
    this.props.deleteLine(index, orderlineId);
  },
  changePrice: function(e){
    var isAllowed = h.validateNumber(e.currentTarget.value) ? true : false; 
    if (!isAllowed) {
      var value = e.target.value;       
      var value2 = value.substring(0, value.length-1);        
      e.target.value =  value2;
      var data = this.state.data;
      data.UnitPrice = value2;
      this.setState({
        data: data
      });

    } else {
      var value = parseFloat(h.validateNumber(e.currentTarget.value));     
      var data = this.state.data;
      data.UnitPrice = value;
      this.setState({
        data: data
      });
    }
    
  },
  changeQuantity: function(e){
    var value = parseInt(e.currentTarget.value);   
    var data = this.state.data;
    data.Quantity = value;
    this.setState({
      data: data
    });


   


  },
  render: function(){   
    var id = "QuantityOrderLine" + this.state.data.Id;     
    var productName = this.state.data.Name;
    var variantClass = "product-code hidden";
    var invalidClass = "";
    if (this.state.data.VariantInfo !== "") {
      productName = this.state.data.Name + " - " + this.state.data.VariantInfo;
      variantClass = "product-code";
    }
    if (this.props.invalid == true) {
      invalidClass = "invalid"
    }
    if(this.state.index !== null) {
      return (
        <tr className={invalidClass}>
          <td className="semibold">
            <div>{productName}</div>
            <div className="product-code">Cod produs: {this.state.data.ProductCode} </div>            
            <div className={variantClass}>Variant: {this.state.data.VariantInfo} | Cod: {this.state.data.VariantNumber}</div> 

          </td>
          <td>
            <div className="form-inline">
              <input type="text" defaultValue={this.state.data.UnitPrice} onChange={this.changePrice} className="form-control input-price" />           
              <button type="button" className="btn-update" onClick={this.updateLine}><i className="fa fa-refresh"></i></button>
            </div>
            <div><small>Pret initial: {this.state.data.OriginalUnitPrice} Lei | Pret client: {this.state.data.CustomerUnitPrice} Lei</small></div>
          </td>
          <td>
            <div className="form-inline">
              <input type="number" id={id} className="form-control quantity" defaultValue={this.props.source.Quantity} onChange={this.changeQuantity} />
              <button type="button" className="btn-update" onClick={this.updateLine}><i className="fa fa-refresh"></i></button>
              <div><small>&nbsp;</small></div>
            </div>
          </td>
          <td>
            {this.props.source.Stock}
          </td>
          <td>{this.props.source.Price} Lei <button type="button" onClick={this.deleteLine} className="btn-delete"><i className="fa fa-close"></i></button></td>
        </tr>
      );
    } else {
      return ( <tr></tr>);
    }
    
  }
});

var OrderList = React.createClass({
   getInitialState: function(){
    return {
      data: [],      
      completedDate: "desc",
      originaldata: []
               
    };
  },
  componentDidMount: function() {  
    $('#orders-list').fadeOut(0);    
    var userId = $('[data-user-id]').attr("data-user-id");
    // userId = "4499"; 
    // var link = "/Files/Extra/EditOrder.ashx?orderId=" + orderId;
    var link = "/Files/Extra/EditOrderCsOrderRepository.ashx?csUserId="+userId+"&status=pending";
    this.serverRequest = $.getJSON(link, function(result) { 
        var data = result.Orders;   
        data = _.orderBy(data, ['CompletedDate'],[this.state.completedDate]);
        this.setState({data: data});
        this.setState({originaldata: data});
    }.bind(this));
    $('#orders-list').fadeIn(1000);

    

  }, 
  componentWillUnmount: function() {
    this.serverRequest.abort();
  },
  sortData: function(){
    var data = this.state.data;
    var that = this;
    if (this.state.completedDate == "desc") {
       this.setState({completedDate: "asc"});
       data = _.orderBy(data, ['CompletedDate'],['asc']);
    } 
    if (this.state.completedDate == "asc") {
       this.setState({completedDate: "desc"});
        data = _.orderBy(data, ['CompletedDate'],['desc']);
    } 
    
    
      that.setState({data: data});
    
    
  },
  handleBlur: function(e) {
    // e.target.value = "";
    // this.setState({data : this.state.originaldata});
    // var data = [];
    // var that = this;
    // setTimeout(function(){
    //   that.setState({data: data});
    //   that.setState({showIcon: false});  
    // }, 300);
    
  },
  resetFilter: function(e) {
    this.setState({data : this.state.originaldata});
    this.refs.filterInput.value = "";
    $(this.refs.deleteFilter).hide();
    console.log(this.refs);
  },
  handleFilterChange: function(e){
    var value = e.target.value;
    var data = this.state.originaldata;      
    var filteredData = _.filter(data, function(obj){
      if ( _.includes(_.lowerCase(obj.Id), value) ||  _.includes(_.lowerCase(obj.CustomerCompany), value) ||  _.includes(_.lowerCase(obj.CustomerName), value) || _.includes(_.lowerCase(obj.CustomerName), value) ||  _.includes(_.lowerCase(obj.DeliveryCity), value) || _.includes(_.lowerCase(obj.CustomerNumber), value)) {
        return true;
      } else {
        return false;
      }
     
    });
    if (filteredData.length != 0 || value!= "") {
      this.setState({data : filteredData});
      $(this.refs.deleteFilter).show();
    } else {
      this.setState({data : this.state.originaldata});
      $(this.refs.deleteFilter).hide();
    }
    

  },
  approveLine: function(i, id){ 
    //approveID = OS11
    var link = "/files/extra/editorderstatus.ashx?orderId=" + id + "&statusId=OS11";
    var that = this;
    $.ajax({
      url: link,
      type: 'POST'
    })
    .done(function() {
      var arr = that.state.data;   
      arr.splice(i, 1);  
      that.setState({data: arr});
    })
    .fail(function() {
      console.log("error");
    });
  },
  rejectLine: function(i, id){
     //approveID = OS13
     // console.log(id);
    var that = this;
    var link = "/files/extra/editorderstatus.ashx?orderId=" + id + "&statusId=OS13";
    $.ajax({
      url: link,
      type: 'POST'
    })
    .done(function() {
      var arr = that.state.data;
      arr.splice(i, 1);
      that.setState({data: arr});
    })
    .fail(function() {
      console.log("error");
    });
    
  }, 
  eachItem: function(item, i) {
    return (
      <OrderListLine key={item.Id} index={i} source={item} approveLine={this.approveLine} rejectLine={this.rejectLine} />
    );
  },
  render: function(){
    
    var lines = this.state.data;
    var sortData = this.state.completedDate;
    var dataClass = "";
    if (lines === undefined) {
      lines = [];
    }  
    if (sortData == "desc") {
      dataClass="fa fa-angle-down";
    } else {
      dataClass="fa fa-angle-up";
    }
    // console.log(lines);
    return (
      <div id="orders-list">               
        <div className="col-xs-12">
          <div id="filterData">
            <input type="text" ref="filterInput" className="filter-data form-control" onChange={this.handleFilterChange} onBlur={this.handleBlur} placeholder="Filtreaza lista" />
            <i ref="deleteFilter" className="delete-filter-data fa fa-close" onClick={this.resetFilter}></i>
          </div>         
            <table width="100%" className="table table-stripped">
              <colgroup>
                <col className="col-data" />
                <col className="col-comanda" />
                <col className="col-utilizator" />
                <col className="col-locatia" />
                <col className="col-pret-total" />
                <col className="col-actiuni" />
              </colgroup>
              <thead>
                <tr>
                  <th onClick={this.sortData} >Data <i className={dataClass}></i></th>
                  <th>Comanda</th>
                  <th>Utilizator</th>
                  <th>Locatia</th>
                  <th>Pret Total</th>
                  <th>Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(this.eachItem)}                
              </tbody>
            </table>                   
        </div>                   
      </div>
    );
  }

});

var OrderListLine = React.createClass({
  getInitialState: function(){
    return {
      data: {},
      index: null      
    };
  },
  componentDidMount: function(){   
    var that = this;
    setTimeout(function(){
      that.setState({data: that.props.source});    
      that.setState({index: that.props.index});     
    }, 100);
  }, 
  approveLine: function(){
    this.props.approveLine(this.state.index, this.state.data.Id);
    // console.log(this.state.data.Id);
  },
  rejectLine: function(){
    this.props.rejectLine(this.state.index, this.state.data.Id);
  },
  render: function(){    
    var link = "/Default.aspx?ID=3864&orderId=" + this.state.data.Id;
    var currentDate = this.state.data.CompletedDate;
    var date = new Date(currentDate);
    var month = date.getMonth() + 1;
    var year = date.getFullYear();
    var day = date.getDate();
    var showDate = day + "/" + month + "/" + year;  
    if(this.state.data.Id !== undefined) {
      if(this.state.data.LocationId) {
        return (
          <tr>
            <td>{showDate}</td>
            <td><a href={link}>{this.state.data.Id}</a></td>
            <td>
              <p>{this.state.data.CustomerName}</p>
              <p>{this.state.data.CustomerCompany}</p>
              <p>{this.state.data.CustomerNumber}</p>
            </td>
            <td>              
              <p>Adresa: {this.state.data.DeliveryAddress}</p>
            </td>
            <td>{this.state.data.Price} Lei</td>
            <td>           
              <div>
                 <button type="button" className="approve-order" onClick={this.approveLine} ><i className="fa fa-check"></i> Verificat de CRC</button>    
              </div>
            </td>

          </tr>

        );
      } else {
        return (
          <tr>
            <td>{showDate}</td>
            <td><a href={link}>{this.state.data.Id}</a></td>
            <td>
              <p>{this.state.data.CustomerName}</p>
              <p>{this.state.data.CustomerCompany}</p>
              <p>{this.state.data.CustomerNumber}</p>
            </td>
            <td>
              
              <p>Adresa: {this.state.data.DeliveryAddress}</p>
            </td>
            <td>{this.state.data.Price} Lei</td>
            <td>           
              Locatie nedefinita
            </td>

          </tr>

        );
      }
      
    } else {
      return ( <tr></tr> );
    }
    
  }
});




var AddOrderlineItem = React.createClass({ 

  getInitialState: function() {
    return {
      data: [],
      showIcon: false,
      order: ""
    }
  },
  componentDidMount: function() {
    // console.log(this.props);
    var that = this;       
    var order = this.props.orderId;
    this.setState({order: order});    
  },
  // componentDidUpdate: function(){
  //   var order = this.state.order;
  //   if(order.length == 0) {
  //     this.setState({order: this.props.orderId});
  //   }
  // },
  handleBlur: function(e) {
    e.target.value = "";
    var data = [];
    var that = this;
    setTimeout(function(){
      that.setState({data: data});
      that.setState({showIcon: false});  
    }, 300);
    
  },
  handleChange: function(e){
    var value = e.target.value;
    var link = "/Default.aspx?ID=3871&q=" + value;
    var that = this;
    $.ajax({
      url: link ,
      type: 'GET'
    })
    .done(function(response) {
      var data = response;
      that.setState({data: data});
      that.setState({showIcon: true});      
    })
    .fail(function() {
      console.log("error");
    });
  },
  addLine: function(itemcode,productnumber, variantInfo){
    this.props.addLine(itemcode, productnumber, variantInfo);
  },
  iconClass: function() {   
    if(this.state.showIcon === true) {
      return "visible";
    } else {
      return "hidden";
    }
  },
  render: function(){       
    return (
      <tr>
        <td colSpan="4">
          <div id="input-search-container">
            <div className="input-container">
              <input type="text" className="addNewLine" onChange={this.handleChange} onBlur={this.handleBlur} placeholder="Cauta produsul dorit" />
              <button type="button" className={this.iconClass()}><i className="fa fa-close"></i></button>
            </div>
            <div className={this.iconClass()}>
              <ListSearchResults data={this.state.data} addLine={this.addLine} />
            </div>
            
          </div>
        </td>
      </tr>
    )
  }
});

var ListSearchResults = React.createClass({
  addLine: function(e){
    this.props.addLine(e.target.attributes["data-itemCode"].value, e.target.attributes["data-productNumber"].value, e.target.attributes["data-variantInfo"].value);
  },
  eachItem: function(item, i) {    
    if (item.variantName != "-") {
      return (
        <div key={i} className="item">
          <button type="button" onClick={this.addLine} data-itemCode={item.itemCode} data-productNumber={item.productNumber} data-variantInfo={item.variantName}><i className="fa fa-plus"></i>{item.itemCode} - {item.name} - {item.variantName}</button>
        </div>
      );  
    } else {
      return (
        <div key={i} className="item">
          <button type="button" onClick={this.addLine} data-itemCode={item.itemCode} data-productNumber={item.productNumber} data-variantInfo=""><i className="fa fa-plus"></i>{item.itemCode} - {item.name}</button>
        </div>
      );  
    }
      
  },
  render: function(){    
    return (
      <div id="result-list">
         {this.props.data.map(this.eachItem)}
      </div>
    )
  }


});



if (document.getElementById('react-order') !== null ){
  ReactDOM.render(<Order />, document.getElementById('react-order'));
}
if (document.getElementById('react-order-list') !== null ){
  ReactDOM.render(<OrderList />, document.getElementById('react-order-list'));
}

