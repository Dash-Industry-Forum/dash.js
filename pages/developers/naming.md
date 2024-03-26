---
layout: default
title: Naming
parent: Developers
---

# Naming

Most of the following conventions, suggestions and recommendations are derived from the books linked in the References
Section.

## General

> Your code is for a human first and a computer second. Humans need good names.
> - Martin Fowler

> There are only two hard things in Computer Science: cache invalidation and naming things.
> - Phil Karlton

## Understandability

### Use accurate parts of speech

| Identifier Type | Parts of Speech                                             | Examples                                     |
 |-----------------|-------------------------------------------------------------|----------------------------------------------|
| `Classes`       | Nouns or noun phrases                                       | `AdaptationSet`, `Representation`            |
| `Variables`     | Nouns, noun phrases, or linking verb and subject complement | `adaptationSet`, `activeStream`, `isPlaying` |
| `Methods`       | Verb, verb phrases, or linking verb and subject complement  | `reset()`, `checkConfig()`, `hasVideoTrack`  |

## Include units

Several properties in the DASH specification require units such as the `bitrate` or the `duration` of a segment
download.
Variables dealing with these values **shall** contain units, for instance:

* `bitrateInKbit` instead of `bitrate`
* `downloadDurationInMilliseconds` instead of `downloadDuration`

## Booleans

Names of `boolean` variables and methods that return a `boolean` should explicitly indicate the return type. Their names
should either be a linking verb or a subject complement. Do not use names that can be interpreted as non-boolean concept.
Examples:

* `isPlaying` instead of `playing`
* `hasVideoTrack()` instead of `videoTrack()`

## References

1. [Naming Things](https://www.amazon.com/Naming-Things-Hardest-Software-Engineering/dp/B0BTLYZWRL) by Tom Benner
2. [Clean Cod A handbook for agile Software craftsmanship](https://a.co/d/d4pJl9s) by Robert C. Martin 
