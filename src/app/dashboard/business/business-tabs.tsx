"use client";
import { useRouter } from "next/navigation";
import { Bell, Bot, Clock, CreditCard, Store, Truck } from "lucide-react";
import type { SettingsDTO } from "@/server/services/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AiForm, DeliveryForm, HoursForm, NotificationsForm, PaymentForm, ProfileForm } from "@/components/settings/forms";

export function BusinessTabs({ settings, readOnly }: { settings: SettingsDTO; readOnly: boolean }) {
  const router = useRouter();
  const props = { settings, readOnly, onSaved: () => router.refresh() };
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile"><Store /> Profile</TabsTrigger>
        <TabsTrigger value="hours"><Clock /> Hours</TabsTrigger>
        <TabsTrigger value="delivery"><Truck /> Delivery & pickup</TabsTrigger>
        <TabsTrigger value="payments"><CreditCard /> Payments</TabsTrigger>
        <TabsTrigger value="ai"><Bot /> AI assistant</TabsTrigger>
        <TabsTrigger value="notifications"><Bell /> Notifications</TabsTrigger>
      </TabsList>
      {[
        ["profile", <ProfileForm key="p" {...props} />],
        ["hours", <HoursForm key="h" {...props} />],
        ["delivery", <DeliveryForm key="d" {...props} />],
        ["payments", <PaymentForm key="pay" {...props} />],
        ["ai", <AiForm key="ai" {...props} />],
        ["notifications", <NotificationsForm key="n" {...props} />],
      ].map(([value, node]) => (
        <TabsContent key={value as string} value={value as string}>
          <Card><CardContent className="pt-5">{node}</CardContent></Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
