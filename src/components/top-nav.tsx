"use client";

import AppSiteHeader, { type AppSiteHeaderProps } from "@/components/app-site-header";

/** @deprecated 使用名称 TopNav；样式与 `community-page` 顶栏一致 */
export type TopNavProps = Omit<AppSiteHeaderProps, "active" | "layoutSpacer"> & {
  active?: AppSiteHeaderProps["active"];
  layoutSpacer?: boolean;
};

export default function TopNav({
  active = null,
  embeddedSearch,
  primaryAction,
  layoutSpacer = true,
}: TopNavProps) {
  return (
    <AppSiteHeader
      active={active}
      embeddedSearch={embeddedSearch}
      primaryAction={primaryAction}
      layoutSpacer={layoutSpacer}
    />
  );
}

/** @deprecated 保留兼容旧用法 */
export function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
      {children}
    </a>
  );
}
