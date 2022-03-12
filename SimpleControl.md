#Simple Panasonic Kairos Control Protocol Definition

####Change History
|Date                |Description                |
|--------------------|---------------------------|
| October 6th 2020   | First edition             |
| October 28th 2020  | Update escape sequences, added list and info command description|   
| January 6th 2021   | General update and minor fixes |
| November 17th 2021 | Introduction of new application event and some additional information about the subscribe command|
| March 1st 2022     | Introduced empty list command to query top level elements
| March 7th 2022     | Introduced keep-alive messages.


##Introduction
The [Simple Panasonic Kairos Control Protocol](http://youtrack.panasonic.wdt/issue/MS-491) can be used to allow external
control devices / software to get access to parameters / functions of the Kairos. It is not defined by the protocol
which parameters / functions are exposed, so it is not possible to prepare a list here. 
The attribute meta information define the exposed status of the objects.
In order to expose an attribute it needs to have the meta information 
"extern". Besides, the "extern" flag the "read_only" flag exists to specify the attribute permissions. A specific 
"read_only" flag that is only valid for external control does not exist yet.

The [Simple Panasonic Kairos Control Protocol](http://youtrack.panasonic.wdt/issue/MS-491) is using TCP as the transport
protocol. Kairos listens per default on port 3005.

### Command
The syntax of the protocol is rather simple to allow easy integration to 3rd party devices / applications. 
Objects and attributes are concatenated with '.' characters. For example "Mixer.AUX.AUX1.source" would specify
the source parameter of the AUX1 object. AUX1 is located in AUX and AUX is located in Mixer.
To describe how to build a command certain things need to be considered. All objects and attributes have a logical name, 
like "AUX1" for example. This information alone is not specific enough, because there could be multiple elements with 
this particular name. The objects are stored in a tree structure and the "AUX1" object that we want to access needs to 
be specified by its path, beginning from the root object (which is excluded in the command). So in this case "AUX1" 
could be accessed by "Mixer.AUX.AUX1". This can produce rather lengthy names that are hard to write at some point. 
To make it simpler the Kairos system provides a way to insert "short cuts" by adding what is called a "script name" 
to the object description. This is done in the case for AUX1, which allows us to access it by "AUX1" directly. 
Since the "script name" is a global identifier it has to be unique. If we have a second object with the name AUX1 
that we want to access we would need to specify it by its path to make clear what object we want to access 
or it needs to have another unique "script name" that belongs to this object. 
If an intermediate node has a "script name" this can also be used to shorten the name. Because a "script name" 
can be used as starting point for the path, since it has to be globally unique. 

E.g. Accessing the Main Scene from root or from SCENES, note SCENES is the "script name" of the Mixer.Scenes element:
````
 - Mixer.Scenes.Main
 - SCENES.Main
````
Every command ends with a "\\r\\n" character sequence or also referred to as <CR><LF> or in ASCII 0D 0A.
Since newline is also used by some systems with a '\\n' or <LF> or ASCII 0A this is also accepted as a command ending
sequence by the Kairos Server. The Kairos Server uses always the '\\r\\n' as a command ending sequence.

If we want to write to an attribute we have to specify it and then use the assignment operator '='.
For example setting the "AUX1.source" parameter to "IN1" would look like this:
````
"AUX1.source=IN1\r\n"
```` 

Note that "IN1" is also a logical name, that follows the same rules as the left hand side of the operation. "IN1" has
a "script name" to allow us easier access otherwise we would need to write
````
AUX1.source=Mixer.Inputs.IN2\r\n
````


The term attribute is used here mostly for parameters like "source". But an attribute can also be something that is
called a "function". Like a "play" function that executes a macro or a clip player. Since functions do not have any
kind of value assigned to them the query and assignment operation have a slightly different meaning.

Lets use the "recall_layout" and "clear_layout" function of a Multiviewer element "MV1" as an example to demonstrate
function behavior. The syntax to execute the "recall_layout" function is the same as an assignment. The left hand side
of the operation describes the function and the right hand side defines the function argument.
````
MV1.recall_layout=1\r\n
````

The "clear_layout" function has no arguments. In this case the right hand side of the assignment can be empty or
it can be written as a query. For example:


````
MV1.clear_layout=\r\n
MV1.clear_layout\r\n
````



Note:

The Kairos Creator will provide a view about the available commands. Additionally the 
[Protocol specific function](###Protocol specific functions) list and info can be used to query sub-elements or 
attributes of a given object.

### Keep-Alive Messages
The protocol specification introduces a keep-alive message to allow the protocol server to identify and remove orphaned
connections. The keep-alive message is mandatory since Kairos v1.2.

The message itself is an empty message with the line ending character sequence "\r\n". The server won't send any
response message. 

Note: Earlier Kairos versions respond with an error message to this command.

The server will disconnect any client that didn't send a message within the time period of 10 seconds.
To avoid accidental disconnects it is recommended to send at least one message within half the period, 5 seconds.
A normal message has the same impact on the timeout behavior than the keep-alive message. 
This means if a client would send one message every 5 seconds, it is not required to send a dedicated keep-alive message 
to keep the connection active. Messages send from the server won't reset the timeout. E.g.,
in case an active [subscription](####Subscribe). would send messages every 5 seconds the client needs to actively send keep-alive
messages to keep the connection active.



### Escape Sequences 
The protocol syntax has some specific characters that cannot be used in an object name description.  

If an object is named "My.AUX" the "." character in the name need to be escaped. The html escape character sequences
are used.

````
: - &#58;
. - &#46;
= - &#61;
\ - &#92;
\r - &#13;
\n - &#10;
````

##### Example
Assume we want to set the source of My.AUX to My.Col it needs to be written like this (if directly accessible):
````
My&#46;AUX.source=My&#46;Col\r\n
````


### Response
Every request produces some sort of response from the Kairos Server. For example if we want to know which source
is selected on "AUX1" we send the following command:
````
Client: "AUX1.source\r\n"
Server: "AUX1.source=IN1\r\n"
````

Note: 

Since the response from the Kairos Server is a valid command this can be used to lookup a command. For example
if it is not known how to set a specific source to AUX1.source someone could use the Kairos Creator select the source
there and then send a query to lookup the command he/she wants to know.


Usually the server responds to a client request before the next request is executed. This can lead to the
assumption that the message that will be received by the client belongs to the previous request. This cannot be
ensured by the system because of the subscribe/unsubscribe mechanism described in 
[Protocol specific functions](###Protocol specific functions).

#### Error Handling
In some error cases the server response can be a simple "Error\\r\\n" indicating that the last command was not executed.
As of today no further description about the error itself is included in this response.
It can be either that the command was written in the wrong way or the command was fine but one object could not
be resolved (could be on the left hand side or the right hand side in case of an assignment).

Some special error conditions exist, one that causes a "Permission Error\\r\\n" response. If an assignment command was send and
the left hand side of the assignment has the "read_only" flag assigned to it.
Another special error condition produces a "Enum Error\\r\\n" response. Some attributes are formed by an enumeration
type and therefore the values that can be specified are limited. If someone tries to set a value that is not defined
this error message shows up. In case of integral values with a defined min or max value no error is produced, if the
value specified not inside the valid range it will be set to either min or max depends on the value provided.

In case of an assignment or the execution of a [Protocol specific functions](###Protocol specific functions), the
Kairos will respond with "OK\\r\\n" to acknowledge the command execution or the simple "Error\\r\\n" response if an error
ocurred. 


### Protocol specific functions
The protocol can be used to query values from parameters, assign values to parameters and execute certain functions of
a system. This allows a wide variety of applications that can be implemented with this protocol. In the current
implementation the protocol supports specific functions to extend these capabilities. Those functions are
"subscribe" and the counter part "unsubscribe" as well as "info" and "list". 
 
The protocol specific functions are written like this:
````
<function>:<command>\r\n
````

The following sections explain those specific functions in detail and show some example use cases.

#### Subscribe

Usually the Kairos will only send messages to the client in case of a request (query or assignment). The "subscribe"
command creates an exception to this rule. Once a client established a subscription to an attribute a message
is automatically send to this client as soon as the attribute value has changed. The message format is the same as
the normal response messages.

An obvious use case for the subscribe mechanism would be the "tally" attribute of an object. In this example
the subscribe function to the tally attribute of the "IN1" object is shown:
````
Client: subscribe:IN1.tally\r\n
Server: OK\r\n
````

Note:

In the current version of the protocol it is not possible to query active subscriptions nor is it possible to
execute an unsubscribe function to "all" elements. The client should keep track of its subscriptions if needed.
The subscription can only be used on attribute level, it is not possible to subscribe to an entire object like "IN1".

#### Unsubscribe

To remove a subscription the "unsubscribe" function is used like this:

````
Client: unsubscribe:IN1.tally\r\n
Server: OK\r\n
```` 

Note: 

If the "unsubscribe" function is called on a attribute without an active subscription the Kairos will respond
with an "Error\\r\\n" message.

#### List & Info

The "list" and "info" commands require special handling because this command will produce a multiline response.
The client can detect the end of the response by searching for two consecutive "\\r\\n" tokens.


The "list" command provides the information about all elements that are accessible within an object.

This command can be used to recursively query all the elements accessible. In this scenario there is no information
about any elements available to the client. Therefore, the client can send an empty list command to query the top
level elements.
````
Client: list:\r\n
Server: SYS\r\n
        Environment\r\n
        Mixer\r\n
        \r\n
````

The list function can also be used to query accessible elements within an already known element SCENES:
````
Client: list:SCENES\r\n
Server: SCENES.Main\r\n
        SCENES.Templates\r\n
        \r\n
````

This information does not specify what kind of element Main or Templates is. In this example both elements are
different. Main is a real scene element that can be controlled and Templates is just a directory that contains scenes.
This information cannot be retrieved by the protocol, a basic knowledge about the production structure is required
for the client here.

If the client is aware that the Templates sub element is a directory that contains scenes another list command can be
used:
````
Client: list:SCENES.Templates\r\n
Server: SCENES.Templates.2Box\r\n
        SCENES.Templates.4Box\r\n
        SCENES.Templates.OTS Left\r\n
        SCENES.Templates.OTS Right\r\n
        SCENES.Templates.Title\r\n
        SCENES.Templates.Sidecar\r\n
        \r\n
````

The same command can now be applied to all sub elements to find the layers or transitions of a scene. The "list" command
does not allow recursive execution. If an element is deeply nested multiple "list" commands might be required to look it
up.   



The "info" command provides information about the attributes of a given element.
Let's assume the client wants to control the 2Box scene element. To query the attributes of the 2Box scene element the
following command can be used: 
````
Client: info:SCENES.Templates.2Box\r\n
Server: SCENES.Templates.2Box.advanced_resolution_control\r\n
        SCENES.Templates.2Box.resolution_x\r\n
        SCENES.Templates.2Box.resolution_y\r\n
        SCENES.Templates.2Box.tally\r\n
        SCENES.Templates.2Box.color\r\n
        SCENES.Templates.2Box.resolution\r\n
        SCENES.Templates.2Box.auto\r\n
        SCENES.Templates.2Box.cut\r\n
        \r\n
````

Again to keep the protocol simple, this command will just provide a list of all elements that are available.
Additional information like the data type of the attribute, or the number of function arguments is not available
and there is no command to retrieve such information. It can be seen as some sort of help mechanism to allow the
client to get a basic overview about the available elements and how to get access to them.

### Event Notification
The idea of the event notification is to inform clients about certain system state changes that are out of the scope of 
the protocol and cannot be handled by the Server. The client receives this information and has to do some action to handle
these cases. 

The event notification messages are written like this:
````
APPLICATION:<event>\r\n
````


The following list shows the event notifications and their meaning.

#### New
The new event gets send out to the clients in case of a data model recreation. This is the case when a new production /
environment file gets loaded. Some elements queried by the client prior to this event might not exist anymore or new
elements appear. In this situation the Server can not keep subscriptions and all active subscriptions get invalidated.

This event can be seen by the client as a complete reset.

The new event syntax:
````
APPLICATION:NEW\r\n
````



### Examples
#### Subscribe to tally parameter and put the source on air.
````
// query tally information
Client: IN1.tally\r\n
Server: IN1.tally=0\r\n

// subscribe
Client: subscribe:IN1.tally\r\n
Server: OK\r\n

// AUX1 is on air, we select IN1 as source
Client: AUX1.source=IN1\r\n
Server: OK\r\n
Server: IN1.tally=1\r\n
````