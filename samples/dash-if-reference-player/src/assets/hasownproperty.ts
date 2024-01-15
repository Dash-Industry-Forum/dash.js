
type Prop = string | number | symbol;

/** Check for object properties and narrow down type */
export function hasOwnProperty<X extends {}, Y extends Prop>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}
