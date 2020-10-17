## Description

There's a lot happening on this page, but let's break it down. Aside from this description, there are 4 main components.

* pendulum simulation
* configuration form
* data form
* error plot

Let's go through them piece by piece. Each section will start with a general overview and some will have a second section that delves into the more technical details of what is happening.

### Pendulum Simulation

In the middle of the page is the pendulum simulation. It is an actual live simulation, not a recording. It simulates a perfect pendulum with no friction or air resistance.

The default simulation method is accurate enough that it will not be immediately obvious that there are two pendulums being displayed for quite some time (after 10 minutes of my development machine the position error was still under 1/1000 of a pixel). There is the black pendulum that is immediately in view which is the simulated pendulum. Behind the black pendulum there is a blue one that represents the true calculated position of the pendulum.

By choosing a less accurate method (such as Euler) and setting the __Min dt__ to a higher value (such as 1.0)

#### Detailed Technical Information

The simulation of the pendulum is being drive by my npm package [generic-rk](https://www.npmjs.com/package/generic-rk), which offers a generic solution for any explicit or embedded Runge-Kutta method that can be represented with a Butcher tableau. [This Wikipedia article](https://en.wikipedia.org/wiki/List_of_Runge%E2%80%93Kutta_methods) offers more information.

The acceleration of the pendulum at any given point is given by the formula

```js
omega = (2.0)^0.5
acceleration = -omega^2.0 * position;
```

For more information on the Runge-Kutta algorithm see the npm package of GitHub page for generic-rk.

The simulation will vary from computer to computer and likely at different points in time. This is due to making the choice to run the simulation in real time rather than at a dedicated time step. The simulation attempts to update the screen 30 times a second if the computer used to display the simulation can't keep up there can definitely be some variation in error. Additionally, some strange behavior can occur if the tab the simulation is open in loses focus. The simulation is also subject to standard floating-point errors. All distances for the simulation are done in pixels so that the data matches the visualization.

The visualization of the pendulum is driven by d3.

### Configuration Form

The configuration form represents the available and tunable arguments for the Runge-Kutta algorithm. Most visitors are likely only going to need the first two fields.

* __Method__ - This field is a list of some the Runge-Kutta methods currently implemented by generic-rk. In general the methods become more accurate as we descend. See the Wikipedia article mentioned earlier for more information on methods.
* __Min dt__ [seconds] - This field is the minimum allowable timestep for the time-adaptive methods, or it is the exact timestep for the explicit methods. This field can used to ensure that the time-adaptive methods will always run in a reasonable time frame regardless of potential errors. __Min dt__ will effectively override the epsilon field.
* __Max dt__ [seconds] - This field is only present for time-adaptive methods. It is possible for the adaptive timestep portion of the Runge-Kutta algorithm to decide to take a very large timestep. This field offers protection from that. __Max dt__ will effectively override the epsilon field.
* __Epsilon__ - This field is only present for time-adaptive methods. This field represents the maximum allowable error between the two calculated orders present in the embedded methods. It is in charge of the adaptive part of the timestep. It will be overridden by __Min dt__ and __Max dt__.
* __Safety Factor__ - This field is only present for time-adaptive methods. The error between different ordered calculations in the explicit methods is an estimate and this offers protection from a potential error in estimation.
* __Update__ - This button will restart the sim with the new arguments. It will restart the sim at the correct position for the pendulum at the time the user clicks the button.

### Data Form

The data form represents the current information about the pendulum system.

* __Position__ - This is the current position in pixels of the center of the bob on the pendulum. The zero position is directly beneath the pivot. The distance is measured around the circumference of the swing.
* __Velocity__ - This is the current velocity in pixels per second of the center of the bob on the pendulum. Clockwise is negative, and counter-clockwise is positive. 
* __Acceleration__ - This is the current acceleration in pixels per second^2 of the center of the bob on the pendulum. Clockwise is negative, and counter-clockwise is positive. 
* __Absolute Position Error__ - This is the current absolute error in position of the simulated pendulum. The error is calculated from the current center of the black bob and the current center of the blue bob.
* __Total Distance Error__ - This is the current total distance traveled error of the simulated pendulum. This is a sum of the change in the __Absolute Position Error__ at every time step. When you first start the sim you can see in the Error Plot that the __Total Distance Error__ exactly matches the __Absolute Position Error__ over the first half swing.

### Error Plot

There isn't too much to the error plot. It updates in real time along with the pendulum, and it plots the values of  __Absolute Position Error__ and __Total Distance Error__ over time. If the user lets the simulation run long enough some noticeable simplifications in the data may appear on the chart. This is due to the page attempting to keep the total number of data points to a reasonable level.

#### Detailed Technical Information

The error plot is created using the JS implementation of Plotly. It uses an implementation of the "Largest Triangle Three Bucket" algorithm by Sveinn Steinarsson to reduce the data points without any significant loss in data visualization. I did not write the implementation of this algorithm that is being used. The visible loss in data seems to be due to the need to run the reduction multiple times not necessarily from an error in the implementation of the algorithm.
