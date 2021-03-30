import React, { Children } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import classNames from "classnames";
import h from "@macrostrat/hyper";

// Class to make an activeLink
const ActiveLink = function ({ children, exact = true, ...props }: any) {
  const router = useRouter();
  const child = Children.only(children);
  let className = child.props.className || "";
  const isActive = exact
    ? router.pathname === props.href
    : router.pathname.startsWith(props.href);
  className = classNames(child.props.className, { active: isActive });
  return h(Link, props, React.cloneElement(child, { className }));
};

export { ActiveLink };
