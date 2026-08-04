import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import { typograph } from "./typograph";

function transform(node: ReactNode): ReactNode {
  if (typeof node === "string") return typograph(node);

  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
    return cloneElement(node, {
      children: Children.map(node.props.children, transform),
    });
  }

  return node;
}

export function Typographed({ children }: { children: ReactNode }) {
  return <>{Children.map(children, transform)}</>;
}
