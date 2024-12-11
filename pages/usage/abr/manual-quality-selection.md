---
layout: default
title: Manual quality selection
parent: Adaptive Bitrate Streaming
grand_parent: Usage
---

# Manual quality selection

Next to the adaptive quality selection of dash.js there is also the possibility for applications and users to
manually select a specific quality (Representation). For that reason, dash.js provides two API endpoints, namely
`setRepresentationForTypeById()` and `setRepresentationForTypeByIndex()`.

## Selecting a Representation by ID

The recommended way to select a specific quality is by using the `id` attribute of the target Representation. A simple
example illustrating this behavior is depicted below:

````js
const availableQualities = player.getRepresentationsByType('video');
const targetRepresentation = availableQualities[0];
player.setRepresentationForTypeById('video', targetRepresentation.id);
````

In the example above we are querying the available qualities. dash.js will return an array of `Representation` objects
with a unique `id` attribute for each of the objects. Finally, we select the first entry in the array and tell dash.js
to switch to this Representation by using the `id` attribute.

## Selecting a Representation by index

Another way to select a specific Representation is by providing its index to dash.js. A simple example illustrating this
behavior is depicted below:

````js
const availableQualities = player.getRepresentationsByType('video');
const targetRepresentationIndex = availableQualities.length - 1;
player.setRepresentationForTypeByIndex('video', targetRepresentationIndex);
````

In the example above we are querying the available qualities. dash.js will return an array of `Representation` objects.
Finally, we count the number of entries in the array and select the one with the highest index.

**Note:** Each `Representation` object has an attribute `absoluteIndex`. This attribute is used internally by
dash.js
and might be different from the index of the `Representation` in the array returned by `getRepresentationsByType()`. For
that reason do **not**  use the `absoluteIndex` when selecting a quality with `setRepresentationForTypeByIndex()`.
Instead, use the index of the target Representation in the array returned by `getRepresentationsByType()`. 
