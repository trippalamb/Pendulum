# Generic-RK

This npm package contains generic Runge-Kutta code that can be used to implement any explicit or embedded methods. The methods currently implemented for use are Forward Euler, Midpoint, Classic 4th order, Cash-Karp, Fehlberg 4-5, and Fehlberg 7-8. If another is needed, simply email me the Butcher tableau, and I'll add it.

The proper way to implement this package is documented below by example. We will create a pendulum entity object.



## Example

First import the package:

```javascript
const RK = require("generic-rk");
```



### Extend `ODESystem`

Next we will create a class that extends the `ODESystem` class. Every ODESystem child must implement two different methods `odeSetup()` and `updateODEs()`.

```javascript
class Pendulum extends RK.ODESystem{

    constructor(){
        //TODO: add logic
    }

    odeSetup(odes){
        //TODO: add logic
    }

    updateODEs(){
        //TODO: add logic
    }

}
```



### Constructor

While not strictly necessary, using the constructor method is good practice.

```javascript
constructor(){
    super(); //call super constructor so you can access `this`
       
    this.t = t; //add a time field, which will also be our interval field
        
    //We make use of the `RK.Pointer` object. This object emulates 
    //the way pointers work in other languages. This allows us to 
    //create our object in the way that makes most sense for the model 
    //and then not have to worry about copying values back and forth 
    //from the rk method.
    this.px = new RK.Pointer(px); //add a position field
    this.vx = new RK.Pointer(vx); //add a velocity field
    this.ax = new RK.Pointer(0.0); //add an acceleration field

    this.px0 = px; //save the initial position
    this.vx0 = vx; //save the initial velocity
    this.omega = Math.sqrt(2.0); //natural frequency for the pendulum
        
    //construct the rk object
    this.rk = new RK.RK(
        2,                   //the number of ode's in the system
        RK.Methods.CashKarp, //Use the RK.Methods Enum to choose the embedded or explicit method to use
                             //We will use CashKarp which is 4th/5th order embedded method. I've chosen 
                             //this method to illustrate the more complex initialization and because
                             //some the simpler methods do not stay accurate for very long
        {
         	minDh: 1.0e-4,   //this is the minimum interval to allow, it will overrule the 
                             //interval calculation based on the desired error value.
          	maxDh: 1.0,      //this is the maximum interval to allow, it will overrule the 
                             //interval calculation based on the desired error value.
                             //maxDh is ignored for explicit (or non-interval varying methods)
          	error:1.0e-4,    //the desired allowed error between the 4th and 5th order methods
                             //error is ignored for explicit (or non-interval varying methods)
           	safetyFactor:0.9 //the safety factor used to make it less likely to have to re-run
                             //rk passes too frequently for interval-varying methods.
                             //safetyFactor is ignored for explicit (or non-interval varying methods)
      	}
    );
        
    this.odeSetup(); //this is a call to one of the required overridden method 
}
```



### Implement `odeSetup()`

This methods purpose is to link the model's fields to the rk's ode's.

```js
odeSetup(){ 

    //`this.rk.odes` should have been initialized during the construction of `this.rk`.
    //`this.rk.odes` length should match the first value in the rk costructor.
    //we will now implement the benefit of the rk.pointer object by connecting the fields of 
    //the model to the rk method odes. We will also define the derivative and integral relations
    //of the ode system in this method.
       
    this.rk.odes[0].connect(
        this.px, //assign the position to the integral value
        this.vx, //assign the velocity to the derivative value
        "position" //optional name for book-keeping purposes
    );
        
    //note that the same value that is the derivative in the previous ode is the integral of this ode
    //this will allow us to only have to calculate the acceleration in order to calculate both
    //velocity and position.
    this.rk.odes[1].connect(this.vx, this.ax, "velocity");

}
```



### Implement `updateODEs()`

This method's purpose is to calculate the top level derivative of your system.

```js
updateODEs(){
    //this method's purpose is to calculate the top level derivatives od your system.
    //to set the value of a pointer object you can use `ptr.val = ...;` as shown below.
    
    this.ax.val = -(Math.pow(this.omega, 2.0) * this.px.val); //formula for the current acceleration 
                                                              //of a pendulum, based on curent position

}
```



Congratulations you have implemented the Adaptive Stepsize Cash-Karp RK method for a pendulum. Next I we will implement a few other optional but I believe helpful patterns for entities using this package.

### Timestep

I believe it is convenient to wrap the `rk.motion` call inside of a timestep function. For other more complicated entities there is often additional logic that needs to be handle at each movement forward in time.

```js
timestep(targetTime) { //target time is the desired time for the entity to now be to
    this.t = this.rk.motion(this, this.t, targetTime); //the `rk.motion` does not alter the interval value 
                                                       //passed in due to the way js arguments work. It returns
                                                       //`targetTime` when the method call completes.
}
```



### Solution

When not simulating a toy model (like a pendulum), one cannot usually exactly calculate the correct value at a given time, hence why we create a simulation. However, since this is likely your first entity created with the generic-rk package, and it might be nice for a sanity check we will also implement the solution function for this pendulum.

```js
solution(time){
    let phi = Math.atan2(-this.vx0, this.px0 * this.omega); //calculate the initial angle
    let amplitude = this.px0/Math.cos(phi); //calculate the initial amplitude

    let position = amplitude*Math.cos(this.omega*time + phi); //caculate the current position
    let velocity = -this.omega*amplitude*Math.sin(this.omega*time + phi); //calculate the current velocity
    let acceleration = -(this.omega*this.omega)*amplitude*Math.cos(this.omega*time + phi); //calculate the current acceleration

    return [time, position, velocity, acceleration]; //return the calculated values so you can check your work.
}
```



### Run the System

Now I will walk you through running the pendulum model and performing a simple test.

```js
var p0 = -200.0; //set the initial position
var v0 = -67.0; //set the initial velocity
var startTime = 0.0; //set the initial time
var endTime = 10.0; //set the end time

var e = new Pendulum(startTime, p0, v0); //construct your pendulum entity
e.timestep(endTime); //move pendulum entity forward to the end time

var output = [e.t, e.px.val, e.vx.val, e.ax.val]; //get the current values that you want to check
var correct = e.solution(endTime); //calculate the correct values

console.log(output);
console.log(correct); 
//if `output` and `correct` are very close it is very likely you implemented everything correctly
//keep in mind the error will get larger over time, and if you are using simpler RK methods it might
//diverge in accuracy much more quickly depending on your model.
```

