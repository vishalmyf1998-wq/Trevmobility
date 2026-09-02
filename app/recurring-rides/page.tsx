import RecurringRideForm from './components/recurring-ride-form'

export default function RecurringRidesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Create Recurring Ride</h1>
        <p className="text-muted-foreground">
          Set up a new recurring booking for a customer.
        </p>
      </div>
      <RecurringRideForm />
    </div>
  )
}
